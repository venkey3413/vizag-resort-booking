const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const http = require('http');

let db;
let lastEventId = 0;
const subscribers = new Set();

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });

    // Create events table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sync_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER,
            data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Poll for new events
async function pollEvents() {
    try {
        const events = await db.all(
            'SELECT * FROM sync_events WHERE id > ? ORDER BY id ASC',
            [lastEventId]
        );

        for (const event of events) {
            lastEventId = event.id;
            
            // Notify all subscribers
            const eventData = {
                type: event.event_type,
                table: event.table_name,
                id: event.record_id,
                data: event.data ? JSON.parse(event.data) : null,
                timestamp: event.timestamp
            };

            subscribers.forEach(res => {
                try {
                    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
                } catch (err) {
                    subscribers.delete(res);
                }
            });
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

// SSE endpoint for real-time updates
const server = http.createServer((req, res) => {
    if (req.url === '/events' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        subscribers.add(res);
        
        req.on('close', () => {
            subscribers.delete(res);
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

initDB().then(() => {
    setInterval(pollEvents, 1000); // Poll every second
    server.listen(3003, () => {
        console.log('🔄 Sync Service running on port 3003');
    });
});