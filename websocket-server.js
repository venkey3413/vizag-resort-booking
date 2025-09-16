const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const AWS = require('aws-sdk');
const { EVENT_BUS_NAME } = require('./eventbridge-service');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3003;

// Configure EventBridge
const eventbridge = new AWS.EventBridge({
    region: 'ap-south-1'
});

// Store connected clients
let connectedClients = new Set();

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    connectedClients.add(socket);
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        connectedClients.delete(socket);
    });
});

// Broadcast refresh to all connected clients
function broadcastRefresh(eventType) {
    console.log(`📡 Broadcasting refresh for: ${eventType}`);
    connectedClients.forEach(socket => {
        if (socket.connected) {
            socket.emit('refresh', { 
                type: 'data_changed',
                eventType: eventType,
                timestamp: new Date().toISOString()
            });
        }
    });
}

// API endpoint to receive EventBridge notifications
app.post('/webhook/eventbridge', express.json(), (req, res) => {
    try {
        const { source, 'detail-type': detailType, detail } = req.body;
        console.log(`📨 Received EventBridge event: ${detailType}`);
        
        // Broadcast to all connected WebSocket clients
        broadcastRefresh(detailType);
        
        res.status(200).json({ message: 'Event processed' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process event' });
    }
});

// Fallback: Periodic refresh every 10 seconds for reliability
setInterval(() => {
    if (connectedClients.size > 0) {
        broadcastRefresh('periodic_sync');
    }
}, 10000);

server.listen(PORT, () => {
    console.log(`🌐 WebSocket server running on port ${PORT}`);
});

module.exports = { io };