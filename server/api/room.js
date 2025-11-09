import { publishToRoom, roomConnections } from '../websocket.js';
import { generateHexToken } from '../util.js';
import { initializeRoom, addUserToRoom, leaveRoom as leaveRoomRedis, getPartyLink, getRoomInfo } from '../websocket.js';


const createRoom = async (req, res) => {
    try {
        const roomId = generateHexToken(8);
        const link = req.body.url || ''; // Get link from request body if provided

        if (!link){
            return res.status(500).json({ error: 'Failed to create room. No link found!' });
        }
        
        const room = await initializeRoom(roomId, req.userId, req.name, link);
        
        if (!room) {
            return res.status(500).json({ error: 'Failed to create room' });
        }
        
        // Initialize WebSocket connections set for this room
        if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
        }
        
        res.json({ roomId: roomId });
    } catch (err) {
        console.error('Error creating room:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}

const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    const { userId, name } = req;

    try {
        // Check if room exists
        const partyRes = await getPartyLink(roomId);
        
        if (partyRes.status === 'error') {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Add user to room in Redis
        await addUserToRoom(roomId, userId, name);

        // Initialize WebSocket connections set for this room if not exists
        if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
        }

        // Publish join event to room
        await publishToRoom(roomId, {
            actionType: 'system',
            type: 'user_joined',
            userId,
            name,
            roomId: roomId,
            timestamp: Date.now()
        });

        res.json({ success: true, message: `${name} joined room ${roomId}` });
    } catch (err) {
        console.error('Error joining room:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}

const leaveRoom = async (req, res) => {
    const { roomId } = req.params;
    const { userId, name } = req;

    try {
        // Check if room exists
        const partyRes = await getPartyLink(roomId);
        
        if (partyRes.status === 'error') {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Remove user from room in Redis
        await leaveRoomRedis(roomId, userId);

        // Remove from WebSocket connections
        if (roomConnections.has(roomId)) {
            // Note: We can't directly delete userId from connections here
            // because connections store WebSocket objects, not userIds
            // The WebSocket handler will clean this up
            const connections = roomConnections.get(roomId);
            
            // Clean up empty room
            if (connections.size === 0) {
                roomConnections.delete(roomId);
            }
        }

        // Publish leave event to room
        await publishToRoom(roomId, {
            actionType: 'system',
            type: 'user_left',
            userId,
            name,
            roomId: roomId,
            timestamp: Date.now()
        });

        res.json({ success: true, message: `${name} left room ${roomId}` });
    } catch (err) {
        console.error('Error leaving room:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}

const sendMessage = async (req, res) => {
    const { roomId } = req.params;
    const { content } = req.body;
    const { userId, name } = req;

    if (!content) {
        return res.status(400).json({ error: 'content required' });
    }

    try {
        // Check if room exists
        const partyRes = await getPartyLink(roomId);
        
        if (partyRes.status === 'error') {
            return res.status(404).json({ error: 'Room not found' });
        }

        const message = {
            actionType: 'chat',
            type: 'message',
            roomId,
            userId,
            name,
            content,
            timestamp: Date.now()
        };

        // Publish to Redis - all workers will receive it
        await publishToRoom(roomId, message);

        res.json({ success: true, message });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

const roomInfo = async (req, res) => {
    const { roomId } = req.params;

    try {
        // Check if room exists and get info
        const roomInfo = await getRoomInfo(roomId);
        
        if (roomInfo.link === undefined) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json(roomInfo);
    } catch (err) {
        console.error('Error getting room info:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

export { createRoom, sendMessage, roomInfo, joinRoom, leaveRoom };