const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { publishEvent, EVENTS } = require('./eventbridge-service');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('admin-public'));

let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Add amenities column if it doesn't exist
    try {
        await db.run('ALTER TABLE resorts ADD COLUMN amenities TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    console.log('✅ Admin database initialized');
}

// Add resort endpoint
app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, description, amenities, image, gallery, videos, map_link } = req.body;
        
        const result = await db.run(`
            INSERT INTO resorts (name, location, price, description, amenities, image, gallery, videos, map_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, location, price, description, amenities, image, gallery, videos, map_link]);
        
        // Publish resort created event
        try {
            await publishEvent('resort.admin', EVENTS.RESORT_ADDED, {
                resortId: result.lastID,
                name: name,
                location: location,
                price: price
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        console.error('Add resort error:', error);
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

// Get resorts endpoint
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all('SELECT * FROM resorts ORDER BY id DESC');
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Update resort endpoint
app.put('/api/resorts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, price, description, amenities, image, gallery, videos, map_link } = req.body;
        
        await db.run(`
            UPDATE resorts SET 
                name = ?, location = ?, price = ?, description = ?, 
                amenities = ?, image = ?, gallery = ?, videos = ?, map_link = ?
            WHERE id = ?
        `, [name, location, price, description, amenities, image, gallery, videos, map_link, id]);
        
        // Publish resort updated event
        try {
            await publishEvent('resort.admin', EVENTS.RESORT_UPDATED, {
                resortId: id,
                name: name,
                amenities: amenities
            });
            // Notify main server
            try {
                await fetch('http://localhost:3000/api/eventbridge-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'resort.updated', data: { resortId: id } })
                });
            } catch (notifyError) {
                console.error('Failed to notify main server:', notifyError);
            }
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update resort error:', error);
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

// Delete resort endpoint
app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM resorts WHERE id = ?', [id]);
        
        // Publish resort deleted event
        try {
            await publishEvent('resort.admin', EVENTS.RESORT_DELETED, {
                resortId: id
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete resort error:', error);
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

// EventBridge Server-Sent Events endpoint
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'EventBridge stream connected' })}\n\n`);
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);
    
    req.on('close', () => {
        clearInterval(keepAlive);
    });
});

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🔧 Admin Panel running on http://0.0.0.0:${PORT}`);
    });
});