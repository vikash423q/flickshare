import { publishToRoom, roomConnections } from '../websocket.js';
import Room from '../model/room.js';
import { generateHexToken } from '../util.js';


const createRoom = (req, res) => {
    const roomId = generateHexToken(8);
    Room.create({roomId, createdBy: req.userId, members: [req.userId]})
    .then(room => {
        roomConnections.set(roomId, new Set());
        res.json({ roomId: room.roomId });
    })
    .catch(err => {
        console.error('Error creating room:', err);
        res.status(500).json({ error: 'Internal server error' });
    });
    
}

const joinRoom = (req, res) => {
    const { roomId } = req.params;
    const { userId } = req;

    Room.findOne({ roomId })
    .then(room => {
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (!room.members.includes(userId)) {
            room.members.push(userId);
            room.save();
        }
        if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId).add(userId);

        res.json({ success: true, message: `${req.userName} Joined room ${roomId}` });
    }   )
    .catch(err => {
        console.error('Error joining room:', err);
        res.status(500).json({ error: 'Internal server error' });
    });
}

const leaveRoom = (req, res) => {
    const { roomId } = req.params;
    const { userId } = req;

    Room.findOne({ roomId })
    .then(async room => {
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (room.members.includes(userId)) {
            // remove userId from members array
            room.members = room.members.filter(id => id !== userId);
            room.save();
        }
        if (roomConnections.has(roomId)) {
            if (roomConnections.get(roomId).has(userId)){
                // remove userId from connections set
                roomConnections.get(roomId).delete(userId);
            }

        }
        await publishToRoom(roomId, {
              type: 'user_left',
              userId,
              roomId: currentRoom,
              timestamp: Date.now()
        });

        res.json({ success: true, message: `${req.userName} Left room ${roomId}` });
    }   )
    .catch(err => {
        console.error('Error leaving room:', err);
        res.status(500).json({ error: 'Internal server error' });
    });
}

const sendMessage = async (req, res) => {
    const { roomId } = req.params;
    const { userId, content } = req.body;

    if (!userId || !content) {
        return res.status(400).json({ error: 'userId and content required' });
    }

    const message = {
        type: 'message',
        roomId,
        userId,
        content,
        timestamp: Date.now()
    };

    // Publish to Redis
    await publishToRoom(roomId, message);

    res.json({ success: true, message });
};

const roomInfo = (req, res) => {
    const { roomId } = req.params;
    const connections = roomConnections.get(roomId);

    res.json({
    roomId,
    activeConnections: connections ? connections.size : 0
    });
};

export { createRoom, sendMessage, roomInfo, joinRoom, leaveRoom };