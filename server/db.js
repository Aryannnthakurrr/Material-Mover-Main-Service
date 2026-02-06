const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    console.log('Server will continue running without database');
  }
}

module.exports = { connectDB };
