const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'rag_db',
    password: 'abcd',
    port: 5432,
});

const initDB = async () => {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('✅ pgvector extension enabled');

        // Drop the old mismatched table and create the correct one with 768 dimensions for Ollama
        const createTableQuery = `
            DROP TABLE IF EXISTS document_chunks;
            CREATE TABLE document_chunks (
                id SERIAL PRIMARY KEY,
                document_id VARCHAR(255),
                chunk_index INTEGER,
                content TEXT NOT NULL,
                embedding VECTOR(768) 
            );
        `;
        
        await pool.query(createTableQuery);
        console.log('✅ document_chunks table ready');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
};

module.exports = {
    pool,
    initDB
};