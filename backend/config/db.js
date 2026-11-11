const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/taskflow';

// Cached across serverless invocations (Vercel) and hot reloads.
const cached = global.mongoose || (global.mongoose = { conn: null, promise: null, warned: false });

class DatabaseError extends Error {
  constructor(reason, cause) {
    super(reason);
    this.reason = reason;
    this.status = 503;
    this.cause = cause;
  }
}

// MONGO_URI wins. In development without it, fall back to a local MongoDB so
// `npm run dev` works out of the box. In production it must be set explicitly.
function resolveUri() {
  const uri = (process.env.MONGO_URI || '').trim();
  if (uri && !uri.includes('<') && !uri.includes('user:pass@')) return uri;
  if (process.env.NODE_ENV === 'production') return null;
  return LOCAL_URI;
}

// Turn driver errors into something a person can act on (no secrets included).
function explain(error) {
  const msg = String(error?.message || error || '');
  if (/querySrv|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(msg)) {
    return 'MongoDB host not found. The Atlas cluster may have been deleted or paused, or MONGO_URI has a typo.';
  }
  if (/bad auth|authentication failed|auth failed|not authorized/i.test(msg)) {
    return 'MongoDB rejected the username or password in MONGO_URI.';
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return 'Nothing is listening at the MongoDB address. Start MongoDB locally or set MONGO_URI.';
  }
  if (/timed out|ETIMEDOUT|Server selection|whitelist|ReplicaSetNoPrimary/i.test(msg)) {
    return 'Could not reach MongoDB in time. In Atlas, open Network Access and allow 0.0.0.0/0, then try again.';
  }
  if (/Invalid scheme|URI|parse/i.test(msg)) {
    return 'MONGO_URI is not a valid MongoDB connection string.';
  }
  return 'Could not connect to MongoDB.';
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const uri = resolveUri();
  if (!uri) throw new DatabaseError('MONGO_URI is not set in the API environment variables.');
  if (!process.env.MONGO_URI && !cached.warned) {
    cached.warned = true;
    console.warn(`[taskflow] MONGO_URI is not set; using local MongoDB at ${LOCAL_URI}`);
  }

  try {
    if (!cached.promise) {
      cached.promise = mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      });
    }
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error(`MongoDB connection error: ${error.message}`);
    throw new DatabaseError(explain(error), error);
  }
};

module.exports = connectDB;
module.exports.explain = explain;
module.exports.DatabaseError = DatabaseError;
