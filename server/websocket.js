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
        // if (data.actionType === 'media' && data.userId === ws.userId){
        //     return;
        // }
        // else if (data.actionType === 'update' && data.userId !== ws.userId){
        //     return;
        // }
        ws.send(payload);
      }
    });
  }
}

const initializeRoom = async (roomId, userId, name, link) => {
    const exists = await redisClient.exists(`room:${roomId}`);
    if (exists) return false;
    
    await redisClient.hSet(`room:${roomId}`, {
        members: JSON.stringify([{userId, name}]), // Redis needs strings
        link: link || '',
        player: JSON.stringify({ // Redis needs strings
            active: false,
            isPlaying: false,
            duration: 1,
            currentTime: -3,
            updatedBy: userId,
            lastUpdate: 0,
        })
    });
    return true;
}

const  updateRoomPlayer = async (roomId, userId, playerState) => {
    let currentRoom = await redisClient.hGetAll(`room:${roomId}`);
    if (!currentRoom || !currentRoom.player) return;
    
    // Parse JSON strings from Redis
    let currentPlayer = JSON.parse(currentRoom.player);
    let members = JSON.parse(currentRoom.members);
    
    const currentTime = new Date().getTime() / 1000;
    let name = '';
    
    if (currentPlayer.active) {
        let found = false;
        members.forEach((item) => {
            if (item.userId === userId) {
                found = true;
                name = item.name;
            }
        });
        
        if (!found) {
            return;
        }

        // if isPlaying is same and currentTime is within 2 seconds -> don't update anything.
        if (currentPlayer.isPlaying === playerState.isPlaying && 
            Math.abs(currentPlayer.currentTime - playerState.currentTime) < 2) {
            return;
        }
        
        // Avoid frequent player update. Could be ping-pong condition
        if (currentTime - currentPlayer.lastUpdate < 1) {
            return;
        }
    }
    
    currentPlayer.active = true;
    currentPlayer.isPlaying = playerState.isPlaying;
    currentPlayer.duration = playerState.duration;
    currentPlayer.currentTime = playerState.currentTime;
    currentPlayer.updatedBy = userId;
    currentPlayer.lastUpdate = currentTime;
    
    await redisClient.hSet(`room:${roomId}`, 'player', JSON.stringify(currentPlayer));
    
    await publishToRoom(roomId, { // Pass roomId, not currentRoom object
        actionType: 'media',
        type: 'video_state_update',
        userId,
        name,
        roomId: roomId, // Fixed: was currentRoom
        isPlaying: playerState.isPlaying, // Fixed: was message.isPlaying
        duration: playerState.duration, // Fixed: was message.duration
        currentTime: playerState.currentTime, // Fixed: was message.currentTime
    });

    setTimeout(()=>{
        publishToRoom(roomId, { // Pass roomId, not currentRoom object
          actionType: 'media',
          type: 'video_state_update',
          userId,
          name,
          roomId: roomId, // Fixed: was currentRoom
          isPlaying: playerState.isPlaying, // Fixed: was message.isPlaying
          duration: playerState.duration, // Fixed: was message.duration
          currentTime: Math.min(playerState.currentTime+1, playerState.duration), // Fixed: was message.currentTime
      });
    }, 1000);
}

const addUserToRoom = async (roomId, userId, name) => {
    let currentRoom = await redisClient.hGetAll(`room:${roomId}`);
    if (!currentRoom || !currentRoom.members) return;
    
    let members = JSON.parse(currentRoom.members);
    let found = members.some(item => item.userId === userId);
    
    if (!found) {
        members.push({userId, name});
        await redisClient.hSet(`room:${roomId}`, 'members', JSON.stringify(members));
    }
}

const leaveRoom = async (roomId, userId) => {
    let currentRoom = await redisClient.hGetAll(`room:${roomId}`);
    if (!currentRoom || !currentRoom.members) return;
    
    let members = JSON.parse(currentRoom.members);
    members = members.filter((item) => item.userId !== userId);
    await redisClient.hSet(`room:${roomId}`, 'members', JSON.stringify(members));
}

const getRoomState = async (roomId, userId) => {
    let currentRoom = await redisClient.hGetAll(`room:${roomId}`);
    if (!currentRoom) return;
    
    const player = JSON.parse(currentRoom.player);
    const members = JSON.parse(currentRoom.members);
    const link = currentRoom.link;
    await publishToRoom(roomId, {
        members, link, player, actionType: 'update', type: 'room_info', roomId, userId
    });
}

const getRoomInfo = async (roomId, userId) => {
    const currentRoom = await redisClient.hGetAll(`room:${roomId}`);
    if (!currentRoom) return {};
    const player = JSON.parse(currentRoom.player);
    const members = JSON.parse(currentRoom.members);
    const link = currentRoom.link;
    return {members, link, player};
}


const getPartyLink = async (roomId) => {
    let currentRoom = await redisClient.hGetAll(`room:${roomId}`);
    if (!currentRoom) return {"status": "error", "message": "Room not found!"};

    return {"status": "success", "link": currentRoom.link};
}

// Subscribe to a room
async function subscribeToRoom(roomId) {
  const channel = `room:${roomId}`;
  
  await subscriber.subscribe(channel, handleRedisMessage);
  console.log(`🔔 Subscribed to ${channel}`);
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
  let currentRoom = null;
  let name = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'ping') return;
      
      // Auth check - should allow 'join' type before checking token
      if (!message.token) {
        console.error('Authorization failed - no token provided', message);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Authentication required' 
        }));
        return;
      }
      
      try {
        var decoded = jwt.verify(message.token, Config.privateKey);
        name = decoded.userName;
        userId = decoded.userId;
      } catch (authError) {
        console.error('JWT verification failed:', authError);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid token' 
        }));
        return;
      }
      
      currentRoom = message.roomId;
      
      if (!currentRoom) {
        console.error('No roomId provided');
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Room ID required' 
        }));
        return;
      }
      
      const roomAvailable = roomConnections.has(currentRoom);
      
      switch (message.type) {
        case 'join':
          // Add connection to room map
          if (!roomAvailable) {
            roomConnections.set(currentRoom, new Set());
          }
          const connections = roomConnections.get(currentRoom);
          
          // Check if this connection already exists
          if (!connections.has(ws)) {
            ws.userId = userId;
            ws.roomId = currentRoom; // Store roomId on ws object
            connections.add(ws);
            console.log(`Client added to room ${currentRoom}`);
          } else {
            console.log(`Client already connected to room ${currentRoom}`);
          }
          
          // Subscribe this worker to the room channel
          await subscribeToRoom(currentRoom);
          await initializeRoom(currentRoom, userId, name, message.link); // Pass link parameter
          await addUserToRoom(currentRoom, userId, name);
          
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
          if (!currentRoom) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Must join a room first' 
            }));
            return;
          }
          
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
          if (!currentRoom || !roomAvailable) {
            console.log('Cannot leave - not in a room');
            return;
          }
          
          // Leave room
          await leaveRoom(currentRoom, userId);
          roomConnections.get(currentRoom).delete(ws);
          
          await publishToRoom(currentRoom, {
                actionType: 'system',
                type: 'user_left',
                userId,
                name,
                roomId: currentRoom,
                timestamp: Date.now()
            });
            
            // Clean up empty rooms
            if (roomConnections.get(currentRoom).size === 0) {
                roomConnections.delete(currentRoom);
            }
            
            console.log(`👋 User ${userId} left room ${currentRoom}`);
            
            ws.send(JSON.stringify({
                type: 'left',
                roomId: currentRoom,
                message: `Left room ${currentRoom}`
            }));
          
          currentRoom = null;
          break;

        case 'room_info':
            if (!currentRoom) {
                ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Must join a room first' 
                }));
                return;
            }
            await getRoomState(currentRoom, userId);
            break;

        case 'video_state':
          if (!currentRoom) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Must join a room first' 
            }));
            return;
          }
          
          const playerState = {
            isPlaying: message.isPlaying, 
            duration: message.duration, 
            currentTime: message.currentTime
          };
          await updateRoomPlayer(currentRoom, userId, playerState);
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Error processing message',
        details: error.message 
      }));
    }
  });

  ws.on('close', async () => {
    // Clean up on disconnect
    if (currentRoom && userId) {
      await leaveRoom(currentRoom, userId);
      
      if (roomConnections.has(currentRoom)) {
        roomConnections.get(currentRoom).delete(ws);
        
        await publishToRoom(currentRoom, {
          actionType: 'system',
          type: 'user_left',
          userId,
          name,
          roomId: currentRoom,
          timestamp: Date.now()
        });
        
        // Clean up empty rooms
        if (roomConnections.get(currentRoom).size === 0) {
          roomConnections.delete(currentRoom);
        }
      }
      
      console.log(`🔌 Connection closed for user ${userId} in room ${currentRoom}`);
    } else {
      console.log(`🔌 Connection closed (no active session)`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });
};

export { handleWebSocketConnection, initRedis, publishToRoom, roomConnections, redisClient, 
    initializeRoom, addUserToRoom, leaveRoom, getRoomInfo, getPartyLink };