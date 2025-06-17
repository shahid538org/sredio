const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Import models
require('./models');

// Import routes
const indexRoutes = require('./routes/index');
const githubRoutes = require('./routes/github');

// Load environment variables
dotenv.config();

// Debug: Log environment variables
console.log('Environment Variables:');
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
console.log('GITHUB_CALLBACK_URL:', process.env.GITHUB_CALLBACK_URL);
console.log('MONGODB_URI:', process.env.MONGODB_URI);

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/integrations', {
  dbName: 'integrations'
})
  .then(() => console.log('Connected to MongoDB database: integrations'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', indexRoutes);
app.use('/api/github', githubRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 