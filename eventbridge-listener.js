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
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        this.subscribers.set(clientId, { res, serviceType });
        
        // Send initial connection event
        res.write('data: {"type":"connected","message":"EventBridge listener active"}\n\n');

        // Start listening if not already running
        if (!this.isListening) {
            this.startListening();
        }

        // Keep alive ping every 15 seconds
        const keepAlive = setInterval(() => {
            if (this.subscribers.has(clientId)) {
                try {
                    res.write(': heartbeat\n\n');
                } catch (error) {
                    clearInterval(keepAlive);
                    this.subscribers.delete(clientId);
                }
            } else {
                clearInterval(keepAlive);
            }
        }, 15000);

        // Cleanup on disconnect
        res.on('close', () => {
            clearInterval(keepAlive);
            this.subscribers.delete(clientId);
        });

        res.on('error', () => {
            clearInterval(keepAlive);
            this.subscribers.delete(clientId);
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
        const toRemove = [];
        
        for (const [clientId, subscriber] of this.subscribers) {
            if (targetService === 'all' || subscriber.serviceType === targetService) {
                try {
                    if (!subscriber.res.destroyed) {
                        subscriber.res.write(eventString);
                    } else {
                        toRemove.push(clientId);
                    }
                } catch (error) {
                    toRemove.push(clientId);
                }
            }
        }
        
        // Clean up dead connections
        toRemove.forEach(clientId => this.subscribers.delete(clientId));
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
        console.log(`📡 Broadcasting to ${this.subscribers.size} subscribers`);

        // Broadcast to all subscribers - let client filter
        this.broadcast(event, 'all');
    }

    stopListening() {
        this.isListening = false;
        // Close all connections
        for (const [clientId, subscriber] of this.subscribers) {
            try {
                subscriber.res.end();
            } catch (error) {
                // Ignore errors when closing
            }
        }
        this.subscribers.clear();
        console.log('📡 EventBridge listener stopped');
    }
}

module.exports = new EventBridgeListener();