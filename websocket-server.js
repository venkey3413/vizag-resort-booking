const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const AWS = require('aws-sdk');
const { EVENT_BUS_NAME } = require('./eventbridge-service');

const app = express();
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

// Poll EventBridge for events (simplified approach)
async function pollEvents() {
    try {
        // In production, use EventBridge Rules + Lambda + WebSocket API
        // For now, we'll use direct polling simulation
        
        // Broadcast to all connected clients
        connectedClients.forEach(socket => {
            if (socket.connected) {
                socket.emit('refresh', { type: 'data_changed' });
            }
        });
    } catch (error) {
        console.error('Polling error:', error);
    }
}

// Simple refresh mechanism every 5 seconds
setInterval(pollEvents, 5000);

server.listen(PORT, () => {
    console.log(`🌐 WebSocket server running on port ${PORT}`);
});

module.exports = { io };