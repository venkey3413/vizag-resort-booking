const WebSocket = require('ws');
const redis = require('redis');

// Create WebSocket server on port 3003
const wss = new WebSocket.Server({ 
  port: 3005,
  perMessageDeflate: false
});

// Create Redis subscriber
const subscriber = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

subscriber.connect().then(() => {
  console.log('✅ WebSocket Server: Redis connected');
  
  // Subscribe to all relevant channels
  subscriber.subscribe('booking:created', (message) => {
    broadcast({ type: 'booking.created', data: JSON.parse(message) });
  });
  
  subscriber.subscribe('booking:updated', (message) => {
    broadcast({ type: 'booking.updated', data: JSON.parse(message) });
  });
  
  subscriber.subscribe('booking:deleted', (message) => {
    broadcast({ type: 'booking.deleted', data: JSON.parse(message) });
  });
  
  subscriber.subscribe('resort:updated', (message) => {
    broadcast({ type: 'resort.updated', data: JSON.parse(message) });
  });
  
  subscriber.subscribe('resort:pricing:updated', (message) => {
    broadcast({ type: 'resort.pricing.updated', data: JSON.parse(message) });
  });
  
  subscriber.subscribe('resort:date:blocked', (message) => {
    broadcast({ type: 'resort.date.blocked', data: JSON.parse(message) });
  });
  
  subscriber.subscribe('resort:date:unblocked', (message) => {
    broadcast({ type: 'resort.date.unblocked', data: JSON.parse(message) });
  });
}).catch(err => {
  console.error('❌ WebSocket Server: Redis connection failed:', err);
});

// Track connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`📱 New WebSocket connection from ${clientIp}`);
  
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected successfully',
    timestamp: Date.now()
  }));
  
  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received from client:', data);
      
      // Handle ping/pong for keep-alive
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (err) {
      console.error('❌ Error parsing message:', err);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`📴 Client disconnected. Active connections: ${clients.size}`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast message to all connected clients
function broadcast(message) {
  const payload = JSON.stringify({
    ...message,
    timestamp: Date.now()
  });
  
  console.log(`📡 Broadcasting to ${clients.size} clients:`, message.type);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Heartbeat to keep connections alive
setInterval(() => {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000); // Every 30 seconds

console.log('🚀 WebSocket Server running on ws://localhost:3005');
console.log('📡 Listening for Redis pub/sub events...');
console.log('🔄 Real-time sync enabled for Android app, website, and owner dashboard');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏹️  Shutting down WebSocket server...');
  wss.close(() => {
    subscriber.quit();
    process.exit(0);
  });
});
