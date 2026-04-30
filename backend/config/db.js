const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;
    
    // If the URI is the placeholder or we're in development, use the in-memory server
    if (!uri || uri.includes('cluster0.mongodb.net') || uri === '') {
      console.log('Starting in-memory MongoDB Server for zero-config local development...');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host} (Using Memory Server: ${uri.includes('127.0.0.1') || uri.includes('localhost')})`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
