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
    
    // Add map_link column if it doesn't exist
    try {
        await db.run('ALTER TABLE resorts ADD COLUMN map_link TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    

}

// Admin API Routes
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all('SELECT * FROM resorts ORDER BY id DESC');
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, description, image, mapLink } = req.body;
        
        if (!name || !location || !price) {
            return res.status(400).json({ error: 'Name, location, and price are required' });
        }
        
        const result = await db.run(
            'INSERT INTO resorts (name, location, price, description, image, map_link) VALUES (?, ?, ?, ?, ?, ?)',
            [name, location, parseInt(price), description || '', image || 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500', mapLink || '']
        );
        
        // Publish resort added event
        try {
            await publishEvent('resort.admin', EVENTS.RESORT_ADDED, {
                resortId: result.lastID,
                name,
                location,
                price
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ id: result.lastID, message: 'Resort added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const { name, location, price, description, image, mapLink } = req.body;
        const id = req.params.id;
        
        await db.run(
            'UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, image = ?, map_link = ? WHERE id = ?',
            [name, location, parseInt(price), description, image, mapLink || '', id]
        );
        
        // Publish resort updated event
        try {
            await publishEvent('resort.admin', EVENTS.RESORT_UPDATED, {
                resortId: id,
                name,
                location,
                price
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ message: 'Resort updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.run('DELETE FROM resorts WHERE id = ?', [id]);
        // Publish resort deleted event
        try {
            await publishEvent('resort.admin', EVENTS.RESORT_DELETED, {
                resortId: id
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🔧 Admin Panel running on http://0.0.0.0:${PORT}`);
    });
});