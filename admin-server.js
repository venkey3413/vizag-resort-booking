const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

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
}

// Add resort endpoint
app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, description, amenities, image, gallery, videos, map_link } = req.body;
        
        const result = await db.run(`
            INSERT INTO resorts (name, location, price, description, amenities, image, gallery, videos, map_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, location, price, description, amenities, image, gallery, videos, map_link]);
        
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

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🔧 Admin Panel running on http://0.0.0.0:${PORT}`);
    });
});