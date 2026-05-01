const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

// Remove top level connectDB
// We will connect via middleware

// CORS - allow all origins in production since we use Vercel rewrites
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection middleware
app.use(async (req, res, next) => {
  // Don't require DB for health check
  if (req.path === '/' || req.path === '/api/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed in middleware:', err);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'TaskFlow API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});



app.use(errorHandler);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for Vercel serverless
module.exports = app;
