// src/routes/documentRoutes.js
const express = require('express');
const multer = require('multer');
const { pdfQueue } = require('../queues/pdfQueue');
const { ChatOllama } = require("@langchain/ollama"); 
const { StringOutputParser } = require("@langchain/core/output_parsers");

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 1. File Upload Route (PRODUCER)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const documentId = req.file.filename; // Real setup me DB se generated id hoti hai

    // Add job to BullMQ background queue (Immediate return)
    const job = await pdfQueue.add('extract-text', {
      documentId,
      filePath: req.file.path,            // Pass path, not buffer
      originalName: req.file.originalname,
    });

    // 202 Accepted: Processing background me shift ho gayi
    res.status(202).json({
      message: 'File received, processing started',
      jobId: job.id,
      documentId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to queue file' });
  }
});

// 2. Poll Job Status Route (BullMQ Queue Status Check)
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await pdfQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json({
      id: job.id,
      state: await job.getState(), // waiting | active | completed | failed
      progress: job.progress,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// 3. Streaming Chat Route (React Frontend ke real-time LLM response ke liye)
// Note: Agar tumhara frontend '/query' call kar raha hai, toh yahan '/chat' ki jagah '/query' kar lena.
router.post('/chat', async (req, res) => {
  // Set headers for HTTP chunked streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const { query } = req.body;

  try {
    // OpenAI hata kar local Ollama setup add kiya gaya hai
    const model = new ChatOllama({ 
      baseUrl: "http://localhost:11434",
      model: "llama3", // Jo model tumne Ollama mein download kiya hai (e.g., llama3 ya mistral)
    });
    
    const parser = new StringOutputParser();

    // Stream LLM response
    const stream = await model.pipe(parser).stream(query);
    
    for await (const chunk of stream) {
      res.write(chunk); // Send each token chunk immediately to React
    }
    
    res.end(); // Close stream connection
  } catch (error) {
    console.error("Streaming error:", error);
    res.status(500).send("Error generating streaming response");
  }
});

module.exports = router;