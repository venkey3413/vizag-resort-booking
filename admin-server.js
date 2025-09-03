const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { pool, initDatabase } = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('admin-public'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
const uploadMultiple = multer({ storage: storage }).array('images', 10);

// Initialize database on startup
initDatabase();

// API Routes
app.get('/api/resorts', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => {
            let amenities = [];
            let images = [];
            try {
                amenities = JSON.parse(row.amenities || '[]');
            } catch (e) {
                amenities = typeof row.amenities === 'string' ? [row.amenities] : [];
            }
            try {
                images = JSON.parse(row.images || '["' + row.image + '"]');
            } catch (e) {
                images = [row.image];
            }
            return {
                ...row,
                amenities,
                images
            };
        });
        res.json(resorts);
    } catch (error) {
        console.error('Error fetching resorts:', error);
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', uploadMultiple, async (req, res) => {
    try {
        const { name, location, price, description, amenities } = req.body;
        
        const amenitiesArray = amenities ? amenities.split(',').map(a => a.trim()) : [];
        const images = req.files && req.files.length > 0 ? req.files.map(file => `/uploads/${file.filename}`) : ['/uploads/default-resort.jpg'];
        const image = images[0];
        
        const [result] = await pool.execute(
            'INSERT INTO resorts (name, location, price, description, image, images, amenities, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, location, parseInt(price), description, image, JSON.stringify(images), JSON.stringify(amenitiesArray), true]
        );
        
        const newResort = {
            id: result.insertId,
            name,
            location,
            price: parseInt(price),
            description,
            image,
            amenities: amenitiesArray,
            images: images,
            rating: 0,
            available: true
        };
        
        res.json(newResort);
    } catch (error) {
        console.error('Error adding resort:', error);
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', uploadMultiple, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, location, price, description, amenities } = req.body;
        
        // Get current resort
        const [current] = await pool.execute('SELECT * FROM resorts WHERE id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        const currentResort = current[0];
        const amenitiesArray = amenities ? amenities.split(',').map(a => a.trim()) : JSON.parse(currentResort.amenities || '[]');
        const newImages = req.files && req.files.length > 0 ? req.files.map(file => `/uploads/${file.filename}`) : null;
        const images = newImages || JSON.parse(currentResort.images || '["' + currentResort.image + '"]');
        const image = images[0];
        
        await pool.execute(
            'UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, image = ?, images = ?, amenities = ? WHERE id = ?',
            [
                name || currentResort.name,
                location || currentResort.location,
                price ? parseInt(price) : currentResort.price,
                description || currentResort.description,
                image,
                JSON.stringify(images),
                JSON.stringify(amenitiesArray),
                id
            ]
        );
        
        const updatedResort = {
            id,
            name: name || currentResort.name,
            location: location || currentResort.location,
            price: price ? parseInt(price) : currentResort.price,
            description: description || currentResort.description,
            image,
            amenities: amenitiesArray,
            images: images,
            rating: currentResort.rating,
            available: currentResort.available
        };
        
        res.json(updatedResort);
    } catch (error) {
        console.error('Error updating resort:', error);
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

// Toggle resort availability
app.patch('/api/resorts/:id/availability', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { available } = req.body;
        
        await pool.execute('UPDATE resorts SET available = ? WHERE id = ?', [available, id]);
        
        res.json({ message: 'Resort availability updated successfully' });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const [result] = await pool.execute('DELETE FROM resorts WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        console.error('Error deleting resort:', error);
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

app.listen(PORT, () => {
    console.log(`Admin Panel running on http://localhost:${PORT}`);
});