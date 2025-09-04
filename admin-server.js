require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./database');
const { upload } = require('./s3-config');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('admin-public'));

// Initialize database on startup
initDatabase();

// API Routes
app.get('/api/resorts', async (req, res) => {
    try {
        const rows = await db().all('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => {
            let amenities = [];
            let images = [];
            let videos = [];
            try {
                amenities = JSON.parse(row.amenities || '[]');
                images = JSON.parse(row.images || '[]');
                videos = JSON.parse(row.videos || '[]');
            } catch (e) {
                amenities = [];
                images = [];
                videos = [];
            }
            return {
                ...row,
                amenities,
                images,
                videos
            };
        });
        res.json(resorts);
    } catch (error) {
        console.error('Error fetching resorts:', error);
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/upload', upload.array('media', 10), (req, res) => {
    try {
        const fileUrls = req.files.map(file => file.location);
        res.json({ urls: fileUrls });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        const result = await db().run(
            'INSERT INTO resorts (name, location, price, description, images, videos, amenities, max_guests, per_head_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, location, parseInt(price), description, JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), parseInt(maxGuests) || 10, parseInt(perHeadCharge) || 300]
        );
        
        res.json({ id: result.lastID, message: 'Resort added successfully' });
    } catch (error) {
        console.error('Error adding resort:', error);
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, location, price, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        await db().run(
            'UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, images = ?, videos = ?, amenities = ?, max_guests = ?, per_head_charge = ? WHERE id = ?',
            [name, location, parseInt(price), description, JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), parseInt(maxGuests) || 10, parseInt(perHeadCharge) || 300, id]
        );
        
        res.json({ message: 'Resort updated successfully' });
    } catch (error) {
        console.error('Error updating resort:', error);
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

app.patch('/api/resorts/:id/availability', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { available } = req.body;
        
        await db().run('UPDATE resorts SET available = ? WHERE id = ?', [available ? 1 : 0, id]);
        
        res.json({ message: 'Resort availability updated successfully' });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const result = await db().run('DELETE FROM resorts WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        console.error('Error deleting resort:', error);
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

app.listen(PORT, () => {
    console.log(`🔧 Admin Panel running on http://localhost:${PORT}`);
});