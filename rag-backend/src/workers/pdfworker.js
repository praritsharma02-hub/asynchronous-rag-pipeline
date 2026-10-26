const path = require('path');
// Guarantee path resolution for .env (even though Ollama doesn't strictly need API keys, good for DB URLs)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const fs = require('fs/promises');
const { connection, QUEUE_NAME } = require('../queues/pdfQueue');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { OllamaEmbeddings } = require("@langchain/ollama");
const { pool } = require('../config/db');

// Explicitly setup Ollama Local Embeddings Model
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text", // Change this if you pulled a different embedding model in Ollama
  baseUrl: "http://localhost:11434", // Default Ollama local URL
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { documentId, filePath, originalName } = job.data;
    console.log(`[job ${job.id}] Extracting text from ${originalName}`);

    // Step 1: Check file exists
    await job.updateProgress(10);
    await fs.access(filePath);

    // Step 2: Parse PDF text using pdfjs-dist (Fixes the bad XRef error)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(await fs.readFile(filePath));
    const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(' ') + '\n';
    }
    
    text = text.trim();
    await job.updateProgress(50);
    
    if (!text) throw new Error('No extractable text (scanned PDF?)');

    // Step 3: Chunking text using LangChain
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text]);

    // Step 4: Generate Ollama Embeddings and Save to Database
    for (let i = 0; i < docs.length; i++) {
      const chunkText = docs[i].pageContent;
      const embedding = await embeddings.embedQuery(chunkText);
      
      await pool.query(
        'INSERT INTO document_chunks (document_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4)',
        [documentId, i, chunkText, JSON.stringify(embedding)]
      );
    }

    await job.updateProgress(100);
    console.log(`[job ${job.id}] Completed successfully! ${docs.length} chunks saved via Ollama.`);
  },
  { connection }
);

console.log('Worker listening for jobs...');
worker.on('failed', (job, err) => {
  console.error(`\n❌ JOB FAILED! Error details:`, err);
});