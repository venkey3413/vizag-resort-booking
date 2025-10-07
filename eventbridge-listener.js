const AWS = require('aws-sdk');
const { EVENTS } = require('./eventbridge-service');

// Initialize EventBridge
const eventbridge = new AWS.EventBridge({
    region: process.env.AWS_REGION || 'ap-south-1'
});

class EventBridgeListener {
    constructor() {
        this.subscribers = new Map();
        this.isListening = false;
    }

    // Subscribe to EventBridge events
    subscribe(clientId, res, serviceType = 'main') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        this.subscribers.set(clientId, { res, serviceType });
        
        // Send initial connection event
        res.write('data: {"type":"connected","message":"EventBridge listener active"}\n\n');

        // Start listening if not already running
        if (!this.isListening) {
            this.startListening();
        }

        // Cleanup on disconnect
        res.on('close', () => {
            this.subscribers.delete(clientId);
            if (this.subscribers.size === 0) {
                this.stopListening();
            }
        });

        // Keep alive ping
        const keepAlive = setInterval(() => {
            try {
                res.write('data: {"type":"ping"}\n\n');
            } catch (error) {
                clearInterval(keepAlive);
                this.subscribers.delete(clientId);
            }
        }, 30000);

        res.on('close', () => {
            clearInterval(keepAlive);
        });
    }

    // Start listening to EventBridge events
    async startListening() {
        this.isListening = true;
        console.log('📡 EventBridge listener started');

        // Simulate EventBridge event listening
        // In production, this would be replaced with actual EventBridge integration
        this.simulateEventBridgeEvents();
    }

    // Simulate EventBridge events for development
    simulateEventBridgeEvents() {
        // This is a placeholder - in production you'd use EventBridge Rules + Lambda + SQS
        // For now, we'll rely on direct EventBridge publishing
        console.log('📡 EventBridge simulation active');
    }

    // Broadcast event to relevant subscribers
    broadcast(event, targetService = 'all') {
        const eventString = `data: ${JSON.stringify(event)}\n\n`;
        
        for (const [clientId, subscriber] of this.subscribers) {
            if (targetService === 'all' || subscriber.serviceType === targetService) {
                try {
                    subscriber.res.write(eventString);
                } catch (error) {
                    this.subscribers.delete(clientId);
                }
            }
        }
    }

    // Handle EventBridge event
    handleEvent(eventType, source, data) {
        const event = {
            type: eventType,
            source,
            data,
            timestamp: new Date().toISOString()
        };

        console.log(`📡 EventBridge event: ${eventType} from ${source}`);

        // Broadcast to appropriate services
        if (eventType.includes('resort')) {
            this.broadcast(event, 'main'); // Main website needs resort updates
        }
        
        if (eventType.includes('booking') || eventType.includes('payment')) {
            this.broadcast(event, 'booking'); // Booking management needs these
        }

        if (eventType.includes('food')) {
            this.broadcast(event, 'admin'); // Admin panel manages food
        }

        // Also broadcast to all for general updates
        this.broadcast(event, 'all');
    }

    stopListening() {
        this.isListening = false;
        console.log('📡 EventBridge listener stopped');
    }
}

module.exports = new EventBridgeListener();