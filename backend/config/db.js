const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If already connected, reuse connection (important for serverless)
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('user:pass@')) {
    console.error('ERROR: No valid MONGO_URI environment variable set.');
    throw new Error('No valid MONGO_URI environment variable set.');
  }

  try {
    if (!cached.promise) {
      cached.promise = mongoose.connect(uri, {
        bufferCommands: false,
      });
    }
    cached.conn = await cached.promise;
    console.log(`MongoDB Connected: ${cached.conn.connection.host}`);
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
