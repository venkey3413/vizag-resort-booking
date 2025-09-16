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
        console.log('📨 Webhook received:', {
            headers: req.headers,
            body: req.body
        });
        
        // Validate API key (optional - EventBridge should send it)
        const apiKey = req.headers['authorization'];
        if (apiKey && apiKey !== 'vizag-resort-2024') {
            console.log('❌ Invalid API key:', apiKey);
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { source, 'detail-type': detailType, detail } = req.body;
        console.log(`📨 Processing EventBridge event: ${detailType}`);
        
        // Broadcast to all connected WebSocket clients
        broadcastRefresh(detailType || 'data_changed');
        
        res.status(200).json({ message: 'Event processed successfully' });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Failed to process event' });
    }
});

// Test endpoint
app.get('/webhook/test', (req, res) => {
    console.log('🧪 Test webhook called');
    broadcastRefresh('test_event');
    res.json({ message: 'Test broadcast sent', clients: connectedClients.size });
});

// Periodic sync removed - only EventBridge events will trigger refresh

server.listen(PORT, () => {
    console.log(`🌐 WebSocket server running on port ${PORT}`);
});

module.exports = { io };