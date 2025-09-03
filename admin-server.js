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

// Initialize database on startup
initDatabase();

// API Routes
app.get('/api/resorts', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => ({
            ...row,
            amenities: JSON.parse(row.amenities || '[]')
        }));
        res.json(resorts);
    } catch (error) {
        console.error('Error fetching resorts:', error);
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', upload.single('image'), async (req, res) => {
    try {
        const { name, location, price, description, amenities } = req.body;
        
        const amenitiesArray = amenities ? amenities.split(',').map(a => a.trim()) : [];
        const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-resort.jpg';
        
        const [result] = await pool.execute(
            'INSERT INTO resorts (name, location, price, description, image, amenities) VALUES (?, ?, ?, ?, ?, ?)',
            [name, location, parseInt(price), description, image, JSON.stringify(amenitiesArray)]
        );
        
        const newResort = {
            id: result.insertId,
            name,
            location,
            price: parseInt(price),
            description,
            image,
            amenities: amenitiesArray,
            rating: 0
        };
        
        res.json(newResort);
    } catch (error) {
        console.error('Error adding resort:', error);
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', upload.single('image'), async (req, res) => {
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
        const image = req.file ? `/uploads/${req.file.filename}` : currentResort.image;
        
        await pool.execute(
            'UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, image = ?, amenities = ? WHERE id = ?',
            [
                name || currentResort.name,
                location || currentResort.location,
                price ? parseInt(price) : currentResort.price,
                description || currentResort.description,
                image,
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
            rating: currentResort.rating
        };
        
        res.json(updatedResort);
    } catch (error) {
        console.error('Error updating resort:', error);
        res.status(500).json({ error: 'Failed to update resort' });
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