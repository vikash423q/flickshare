import { createClient } from "redis";

import Config from './config.js';

// Redis clients - need separate clients for pub and sub
const publisher = createClient({ url: Config.REDIS_URL });
const subscriber = createClient({ url: Config.REDIS_URL});

// Store active connections per room
// Map<roomId, Set<WebSocket>>
const roomConnections = new Map();

// Initialize Redis connections
async function initRedis() {
  await publisher.connect();
  await subscriber.connect();
  console.log('✅ Connected to Redis');
}

// Handle incoming messages from Redis and broadcast to room members
async function handleRedisMessage(channel, message) {
  console.log(`📨 Received from Redis channel ${channel}:`, message);
  
  const roomId = channel.replace('room:', '');
  const connections = roomConnections.get(roomId);
  
  if (connections) {
    const data = JSON.parse(message);
    const payload = JSON.stringify(data);
    
    // Broadcast to all WebSocket connections in this room
    connections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    });
  }
}

// Subscribe to a room
async function subscribeToRoom(roomId) {
  const channel = `room:${roomId}`;
  
  // Check if already subscribed
  const existingChannels = await subscriber.sendCommand(['PUBSUB', 'CHANNELS', channel]);
  
  if (!existingChannels.includes(channel)) {
    await subscriber.subscribe(channel, handleRedisMessage);
    console.log(`🔔 Subscribed to ${channel}`);
  }
}

// Publish message to room
async function publishToRoom(roomId, message) {
  const channel = `room:${roomId}`;
  await publisher.publish(channel, JSON.stringify(message));
  console.log(`📤 Published to ${channel}`);
}

// WebSocket connection handler
const handleWebSocketConnection = (ws) => {
  console.log('🔌 New WebSocket connection');
  
  let currentRoom = null;
  let userId = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join':
          // Join a room
          userId = message.userId;
          currentRoom = message.roomId;
          
          // Add connection to room map
          if (!roomConnections.has(currentRoom)) {
            roomConnections.set(currentRoom, new Set());
          }
          roomConnections.get(currentRoom).add(ws);
          
          // Subscribe this worker to the room channel
          await subscribeToRoom(currentRoom);
          
          // Notify others
          await publishToRoom(currentRoom, {
            type: 'user_joined',
            userId,
            roomId: currentRoom,
            timestamp: Date.now()
          });
          
          ws.send(JSON.stringify({
            type: 'joined',
            roomId: currentRoom,
            message: `Joined room ${currentRoom}`
          }));
          
          console.log(`👤 User ${userId} joined room ${currentRoom}`);
          break;
          
        case 'message':
          // Send chat message
          if (!currentRoom) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not in a room' 
            }));
            return;
          }
          
          const chatMessage = {
            type: 'message',
            roomId: currentRoom,
            userId,
            content: message.content,
            timestamp: Date.now()
          };
          
          // Publish to Redis - all workers will receive it
          await publishToRoom(currentRoom, chatMessage);
          break;
          
        case 'leave':
          // Leave room
          if (currentRoom && roomConnections.has(currentRoom)) {
            roomConnections.get(currentRoom).delete(ws);
            
            await publishToRoom(currentRoom, {
              type: 'user_left',
              userId,
              roomId: currentRoom,
              timestamp: Date.now()
            });
            
            console.log(`👋 User ${userId} left room ${currentRoom}`);
            currentRoom = null;
          }
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
        type: 'user_left',
        userId,
        roomId: currentRoom,
        timestamp: Date.now()
      });
      
      console.log(`🔌 Connection closed for user ${userId}`);
    }
  });
}


export { handleWebSocketConnection, initRedis, publishToRoom, roomConnections };