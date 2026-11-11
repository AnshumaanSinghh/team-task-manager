const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

dotenv.config({ quiet: true });

const VERSION = '3.1.0';
const isProduction = process.env.NODE_ENV === 'production';

// Development gets a throwaway secret so `npm run dev` just works. Production
// never does: requests get a clear 503 until JWT_SECRET is configured.
if (!process.env.JWT_SECRET && !isProduction) {
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

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TaskFlow API is running', timestamp: new Date().toISOString(), version: VERSION });
});

// Deployment check: is the database reachable and is the JWT secret configured?
// Reports booleans and reasons only, never secrets.
app.get('/api/health', async (req, res) => {
  const checks = { api: 'ok', jwtSecret: process.env.JWT_SECRET ? 'set' : 'missing', database: 'connected' };
  try {
    await connectDB();
  } catch (err) {
    checks.database = 'error';
    checks.databaseError = err.reason || 'Could not connect to MongoDB.';
  }
  const healthy = checks.database === 'connected' && checks.jwtSecret === 'set';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', (req, res, next) => {
  if (process.env.JWT_SECRET) return next();
  return res.status(503).json({ message: 'The server is not configured yet: set JWT_SECRET in the API environment variables.' });
});

// Lazy database connection (cached across serverless invocations).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: `Database unavailable. ${err.reason || 'Please try again shortly.'}` });
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
