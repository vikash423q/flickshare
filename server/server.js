import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { authenticate, info, updateUserInfo, generateUserToken } from './api/user.js';
import { createRoom, sendMessage, roomInfo, joinRoom, leaveRoom} from './api/room.js';
import { handleWebSocketConnection } from './websocket.js';
import { auth } from './middleware/auth.js';
import Config from './config.js';
import setup from './setup.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: 'http://localhost:5173', credentials: true}));

const server = createServer(app);
const wss = new WebSocketServer({ server });
wss.on('connection', handleWebSocketConnection);

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
app.put('/api/user/info', auth, updateUserInfo);
app.get('/api/user/generate-token', auth, generateUserToken);


// Chat room endpoints
app.post('/api/rooms', auth, createRoom);
app.post('/api/rooms/:roomId/messages', auth, sendMessage);
app.get('/api/rooms/:roomId/info', auth, roomInfo);
app.post('/api/rooms/:roomId/join', auth, joinRoom);
app.post('/api/rooms/:roomId/leave', auth, leaveRoom);


// Initial setup
setup();


// Start the server
server.listen(Config.PORT, '0.0.0.0', () => {
  console.log(`Listening on port ${Config.PORT}`)
});
