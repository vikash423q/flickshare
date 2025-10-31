import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import Config from './config.js';
import setup from './setup.js';

import { authenticate, info } from './api/user.js';
import { auth } from './middleware/auth.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(`mongodb://${Config.MONGODB_USERNAME}:${Config.MONGODB_PASSWORD}@${Config.MONGODB_HOST}`, {
      dbName: Config.DB_NAME
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}
await connectDB();

// Healthcheck endpoint
app.get('/healthcheck', (req, res) => {
  res.send('OK')
});

// User endpoints
app.post('/api/user/authenticate', authenticate);
app.get('/api/user/info', auth, info);


// Initial setup
setup();

// Start the server
app.listen(Config.PORT, () => {
  console.log(`Listening on port ${Config.PORT}`)
});
