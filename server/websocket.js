import { createClient } from "redis";

import jwt from 'jsonwebtoken';
import Config from './config.js';

// Redis clients - need separate clients for pub and sub
const publisher = createClient({ url: Config.REDIS_URL });
const subscriber = createClient({ url: Config.REDIS_URL });
const redisClient = createClient({ url: Config.REDIS_URL });

publisher.on('error', (err) => console.error('Redis Publisher Error', err));
subscriber.on('error', (err) => console.error('Redis Subscriber Error', err));
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Store active connections per room
// Map<roomId, Set<WebSocket>>
const roomConnections = new Map();

// Initialize Redis connections
async function initRedis() {
  await publisher.connect();
  await subscriber.connect();
  await redisClient.connect();
  console.log('✅ Connected to Redis');
}

// Handle incoming messages from Redis and broadcast to room members
async function handleRedisMessage(message, channel) {
  console.log(`📨 Received from Redis channel ${channel}:`, message);
  
  const roomId = channel.replace('room:', '');
  const connections = roomConnections.get(roomId);
  
  if (connections) {
    const data = JSON.parse(message);
    const payload = JSON.stringify(data);
    
    // Broadcast to all WebSocket connections in this room
    connections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        if (!(data.actionType === 'media' && data.userId === ws.userId)){
          ws.send(payload);
        }
      }
    });
  }
}

const getRoomActiveConnections = async (roomId) => {
  const value = await redisClient.get(roomId);
  if (value === null) {
    return 0;
  }
  return value;
}

// Subscribe to a room
async function subscribeToRoom(roomId) {
  const channel = `room:${roomId}`;
  
  // Check if already subscribed
  const activeConnections = await getRoomActiveConnections(channel);
  
  await subscriber.subscribe(channel, handleRedisMessage);
  console.log(`🔔 Subscribed to ${channel}`);
  await redisClient.set(channel, activeConnections + 1);
}

// Publish message to room
async function publishToRoom(roomId, message) {
  const channel = `room:${roomId}`;
  await publisher.publish(channel, JSON.stringify(message));
  console.log(`📤 Published to ${channel} ${JSON.stringify(message)}`);
}

// WebSocket connection handler
const handleWebSocketConnection = (ws) => {
  console.log('🔌 New WebSocket connection');
    
    let userId = null;
    let currentRoom = null ;
    let name = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'ping') return;
      var decoded = jwt.verify(message.token, Config.privateKey);
      name = decoded.userName;
      userId = decoded.userId;
      currentRoom = message.roomId;
      const roomAvailable = roomConnections.has(currentRoom);
      
      switch (message.type) {
        case 'join':
          // Add connection to room map
          if(!roomAvailable) {
            roomConnections.set(currentRoom, new Set());
          }
          const connections = roomConnections.get(currentRoom);
          // Check if this connection already exists
          if (!connections.has(ws)) {
            ws.userId = userId;
            connections.add(ws);
            console.log(`Client added to room ${currentRoom}`);
          } else {
            console.log(`Client already connected to room ${currentRoom}`);
          }
          
          // Subscribe this worker to the room channel
          await subscribeToRoom(currentRoom);
          
          // Notify others
          await publishToRoom(currentRoom, {
            actionType: 'system',
            type: 'user_joined',
            userId,
            name,
            roomId: currentRoom,
            timestamp: Date.now()
          });
          
          ws.send(JSON.stringify({
            type: 'joined',
            roomId: currentRoom,
            userId: userId,
            name,
            message: `Joined room ${currentRoom}`
          }));
          
          console.log(`👤 User ${userId} joined room ${currentRoom}`);
          break;
          
        case 'message':
          const chatMessage = {
            actionType: 'chat',
            type: 'message',
            roomId: currentRoom,
            name,
            userId,
            content: message.content,
            timestamp: Date.now()
          };
          
          // Publish to Redis - all workers will receive it
          await publishToRoom(currentRoom, chatMessage);
          break;
          
        case 'leave':
          // Leave room
          if (roomAvailable) {
            roomConnections.get(currentRoom).delete(ws);
            
            await publishToRoom(currentRoom, {
              actionType: 'system',
              type: 'user_left',
              userId,
              name,
              roomId: currentRoom,
              timestamp: Date.now()
            });
            const channel = `room:${currentRoom}`;
            await redisClient.set(channel, Math.max(0, await getRoomActiveConnections(channel) - 1));
            
            console.log(`👋 User ${userId} left room ${currentRoom}`);
            currentRoom = null;
          }
          break;

        case 'video_state':
          await publishToRoom(currentRoom, {
              actionType: 'media',
              type: 'video_state',
              userId,
              name,
              roomId: currentRoom,
              isPlaying: message.isPlaying,
              duration: message.duration,
              currentTime: message.currentTime,
          });
          break;

      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });

  ws.on('close', async () => {
    // Clean up on disconnect
    if (currentRoom && roomConnections.has(currentRoom)) {
      roomConnections.get(currentRoom).delete(ws);
      
      await publishToRoom(currentRoom, {
        actionType: 'system',
        type: 'user_left',
        userId,
        name,
        roomId: currentRoom,
        timestamp: Date.now()
      });
      
      console.log(`🔌 Connection closed for user ${userId}`);
    }
  });

  ws.on('pong', () => {ws.isAlive=true});
}


export { handleWebSocketConnection, initRedis, publishToRoom, roomConnections };