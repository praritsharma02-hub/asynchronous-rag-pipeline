const express = require('express');
const documentRoutes = require('./src/routes/documentRoutes');
const { initDB } = require('./src/config/db');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount document routes
app.use('/api/documents', documentRoutes);

// Global error handling
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Initialize Database then start serverE
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
  });