const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

dotenv.config({ quiet: true });

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  console.warn('[taskflow] JWT_SECRET is not set; using an insecure development secret.');
  process.env.JWT_SECRET = 'taskflow-dev-only-secret';
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// CORS: allow the configured frontend origins, or every origin when none is configured.
const allowed = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowed.length ? (origin, cb) => cb(null, !origin || allowed.includes(origin)) : true,
  credentials: true
}));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

// Health checks do not need the database.
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TaskFlow API is running', timestamp: new Date().toISOString(), version: '3.0.0' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Lazy database connection (cached across serverless invocations).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.use(notFound);
app.use(errorHandler);

// Railway / local: listen. Vercel imports the app instead. Tests import it too.
if (require.main === module && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`TaskFlow API running on port ${PORT}`));
}

module.exports = app;
