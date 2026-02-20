const redis = require('redis');

class RedisPubSub {
    constructor() {
        this.publisher = null;
        this.subscriber = null;
        this.isConnected = false;
        this.subscribers = new Map(); // clientId -> response object
    }

    async connect() {
        try {
            // Connect to Redis (Docker or local)
            const redisUrl = process.env.REDIS_URL;
            let redisHost = process.env.REDIS_HOST || 'localhost';
            const redisPort = process.env.REDIS_PORT || 6379;
            
            // Use Docker service name if in container
            if (process.env.NODE_ENV === 'development' || process.env.REDIS_URL) {
                redisHost = 'redis';
            }

            const clientConfig = redisUrl ? { url: redisUrl } : {
                socket: {
                    host: redisHost,
                    port: redisPort
                }
            };

            this.publisher = redis.createClient(clientConfig);
            this.subscriber = redis.createClient(clientConfig);

            // Add error handlers to prevent crashes
            this.publisher.on('error', (err) => {
                console.error('Redis Publisher Error:', err.message);
            });

            this.subscriber.on('error', (err) => {
                console.error('Redis Subscriber Error:', err.message);
            });

            await this.publisher.connect();
            await this.subscriber.connect();

            this.isConnected = true;
            console.log(`✅ Redis connected: ${redisHost}:${redisPort}`);

            // Subscribe to all channels
            await this.subscriber.subscribe('resort-events', (message) => {
                this.handleMessage('resort-events', message);
            });

            await this.subscriber.subscribe('event-events', (message) => {
                this.handleMessage('event-events', message);
            });

            await this.subscriber.subscribe('booking-events', (message) => {
                this.handleMessage('booking-events', message);
            });

            await this.subscriber.subscribe('coupon-events', (message) => {
                this.handleMessage('coupon-events', message);
            });

            console.log('✅ Subscribed to all event channels');
        } catch (error) {
            console.error('❌ Redis connection failed:', error.message);
            this.isConnected = false;
        }
    }

    async publish(channel, event) {
        if (!this.isConnected) {
            console.log('⚠️ Redis not connected, skipping publish');
            return;
        }

        try {
            const message = JSON.stringify(event);
            await this.publisher.publish(channel, message);
            console.log(`📡 Published to ${channel}:`, event.type);
        } catch (error) {
            console.error('❌ Redis publish failed:', error.message);
        }
    }

    handleMessage(channel, message) {
        try {
            const event = JSON.parse(message);
            console.log(`📥 Received from ${channel}:`, event.type);

            // Broadcast to all SSE subscribers
            this.subscribers.forEach((res, clientId) => {
                try {
                    res.write(`data: ${message}\n\n`);
                } catch (error) {
                    console.log(`❌ Failed to send to ${clientId}, removing`);
                    this.subscribers.delete(clientId);
                }
            });
        } catch (error) {
            console.error('❌ Message handling failed:', error.message);
        }
    }

    subscribe(clientId, res) {
        this.subscribers.set(clientId, res);
        console.log(`📡 Client ${clientId} subscribed (total: ${this.subscribers.size})`);

        // Send initial connection message
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        res.write('data: {"type":"connected"}\n\n');

        // Remove on disconnect
        res.on('close', () => {
            this.subscribers.delete(clientId);
            console.log(`📡 Client ${clientId} disconnected (total: ${this.subscribers.size})`);
        });
    }

    async disconnect() {
        if (this.publisher) await this.publisher.quit();
        if (this.subscriber) await this.subscriber.quit();
        this.isConnected = false;
        console.log('❌ Redis disconnected');
    }
}

// Singleton instance
const redisPubSub = new RedisPubSub();

module.exports = redisPubSub;
