const redis = require('redis');

const ALL_CHANNELS = [
    'resort-events',
    'event-events',
    'booking-events',
    'coupon-events',
];

const HEARTBEAT_INTERVAL_MS = 25000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

class RedisPubSub {
    constructor() {
        this.publisher = null;
        this.subscriber = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.subscribers = new Map();
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.shuttingDown = false;
    }

    _buildClientConfig() {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) return { url: redisUrl };
        return {
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                reconnectStrategy: false,
            }
        };
    }

    async connect() {
        if (this.isConnecting || this.isConnected || this.shuttingDown) return;
        this.isConnecting = true;
        try {
            const config = this._buildClientConfig();
            const hostInfo = config.url || `${config.socket.host}:${config.socket.port}`;
            console.log(`🔄 Connecting to Redis: ${hostInfo}`);

            this.publisher = redis.createClient(config);
            this.subscriber = redis.createClient(config);

            this.publisher.on('error', (err) => console.error('❌ Redis Publisher Error:', err.message));
            this.subscriber.on('error', (err) => console.error('❌ Redis Subscriber Error:', err.message));
            this.publisher.on('end', () => this._onDisconnected('publisher'));
            this.subscriber.on('end', () => this._onDisconnected('subscriber'));

            await this.publisher.connect();
            await this.subscriber.connect();

            for (const channel of ALL_CHANNELS) {
                await this.subscriber.subscribe(channel, (message) => {
                    this.handleMessage(channel, message);
                });
            }

            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
            console.log(`✅ Redis connected: ${hostInfo}`);
            console.log(`✅ Subscribed to channels: ${ALL_CHANNELS.join(', ')}`);
        } catch (error) {
            this.isConnected = false;
            this.isConnecting = false;
            console.error('❌ Redis connection failed:', error.message);
            this._scheduleReconnect();
        }
    }

    _scheduleReconnect() {
        if (this.shuttingDown || this.reconnectTimer) return;
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts), RECONNECT_MAX_DELAY_MS);
        this.reconnectAttempts++;
        console.log(`🔄 Redis reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try { await this.publisher?.quit(); } catch (_) {}
            try { await this.subscriber?.quit(); } catch (_) {}
            this.publisher = null;
            this.subscriber = null;
            await this.connect();
        }, delay);
    }

    _onDisconnected(which) {
        if (this.isConnected) {
            console.error(`❌ Redis ${which} disconnected unexpectedly`);
            this.isConnected = false;
            this._scheduleReconnect();
        }
    }

    async publish(channel, event) {
        if (!this.isConnected || !this.publisher) {
            console.warn(`⚠️ Redis not connected — dropped publish to '${channel}':`, event.type || event);
            return;
        }
        try {
            await this.publisher.publish(channel, JSON.stringify(event));
            console.log(`📡 Published to ${channel}:`, event.type || '(no type)');
        } catch (error) {
            console.error('❌ Redis publish failed:', error.message);
        }
    }

    handleMessage(channel, message) {
        try {
            const event = JSON.parse(message);
            console.log(`📥 Received from ${channel}:`, event.type || '(no type)');
            for (const [clientId, client] of this.subscribers.entries()) {
                try {
                    client.res.write(`data: ${message}\n\n`);
                } catch (_) {
                    this._removeSubscriber(clientId);
                }
            }
        } catch (error) {
            console.error('❌ Message handling failed:', error.message);
        }
    }

    subscribe(clientId, res) {
        // Headers sent FIRST before adding to map
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no',
        });
        res.write('data: {"type":"connected"}\n\n');

        const heartbeat = setInterval(() => {
            try { res.write(': ping\n\n'); }
            catch (_) { this._removeSubscriber(clientId); }
        }, HEARTBEAT_INTERVAL_MS);

        this.subscribers.set(clientId, { res, heartbeat });
        console.log(`📡 SSE client connected: ${clientId} (total: ${this.subscribers.size})`);

        res.on('close', () => {
            this._removeSubscriber(clientId);
            console.log(`📡 SSE client disconnected: ${clientId} (total: ${this.subscribers.size})`);
        });
    }

    _removeSubscriber(clientId) {
        const client = this.subscribers.get(clientId);
        if (client) { clearInterval(client.heartbeat); this.subscribers.delete(clientId); }
    }

    async disconnect() {
        this.shuttingDown = true;
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        for (const [, client] of this.subscribers.entries()) {
            clearInterval(client.heartbeat);
            try { client.res.end(); } catch (_) {}
        }
        this.subscribers.clear();
        try { if (this.publisher) await this.publisher.quit(); } catch (_) {}
        try { if (this.subscriber) await this.subscriber.quit(); } catch (_) {}
        this.isConnected = false;
        console.log('🔌 Redis disconnected cleanly');
    }
}

const redisPubSub = new RedisPubSub();
process.on('SIGTERM', () => redisPubSub.disconnect());
process.on('SIGINT', () => redisPubSub.disconnect());
module.exports = redisPubSub;