class EventBridgeSync {
    constructor() {
        this.subscribers = new Map();
    }

    // Subscribe to real-time updates
    subscribe(clientId, res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        this.subscribers.set(clientId, res);
        
        // Send initial connection event
        res.write('data: {"type":"connected","message":"EventBridge sync active"}\n\n');

        // Keep alive ping every 30 seconds
        const keepAlive = setInterval(() => {
            try {
                res.write('data: {"type":"ping"}\n\n');
            } catch (error) {
                clearInterval(keepAlive);
                this.subscribers.delete(clientId);
            }
        }, 30000);

        // Cleanup on disconnect
        res.on('close', () => {
            clearInterval(keepAlive);
            this.subscribers.delete(clientId);
        });
    }

    // Broadcast event to all connected clients
    broadcast(event) {
        const eventString = `data: ${JSON.stringify(event)}\n\n`;
        
        for (const [clientId, res] of this.subscribers) {
            try {
                res.write(eventString);
            } catch (error) {
                this.subscribers.delete(clientId);
            }
        }
    }

    // Notify about EventBridge events
    notifyEvent(type, source, data) {
        const event = {
            type,
            source,
            data,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📡 EventBridge sync: ${type}`);
        this.broadcast(event);
    }
}

module.exports = new EventBridgeSync();