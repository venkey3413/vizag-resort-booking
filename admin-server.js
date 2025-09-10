require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const csrf = require('csurf');
const { db, initDatabase } = require('./database');
const { upload } = require('./s3-config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 3001;

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('admin-public'));

const csrfProtection = csrf({ cookie: true });

function requireAuth(req, res, next) {
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const jwt = token.substring(7);
    if (jwt.length < 10 || !jwt.includes('.') || jwt.split('.').length !== 3) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
    
    try {
        const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
        if (!payload.exp || payload.exp < Date.now() / 1000) {
            return res.status(401).json({ error: 'Token expired' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    next();
}

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ token: req.csrfToken() });
});

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

app.post('/api/upload', csrfProtection, requireAuth, upload.array('media', 10), (req, res) => {
    try {
        const fileUrls = req.files.map(file => file.location);
        res.json({ urls: fileUrls });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.post('/api/resorts', csrfProtection, requireAuth, async (req, res) => {
    try {
        const { name, location, price, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        if (!name || !location || !price) {
            return res.status(400).json({ error: 'Name, location, and price are required' });
        }
        
        const result = await db().run(
            'INSERT INTO resorts (name, location, price, description, images, videos, amenities, available, max_guests, per_head_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, location, parseInt(price), description || 'No description', JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), 1, parseInt(maxGuests) || 10, parseInt(perHeadCharge) || 300]
        );
        
        const newResort = { 
            id: result.lastID, 
            name, 
            location, 
            price: parseInt(price), 
            description, 
            images, 
            videos, 
            amenities,
            available: true,
            max_guests: parseInt(maxGuests) || 10,
            per_head_charge: parseInt(perHeadCharge) || 300
        };
        
        // Sync with other services via API Gateway
        await syncServices('resort-added', newResort);
        
        res.json({ id: result.lastID, message: 'Resort added successfully' });
    } catch (error) {
        console.error('Error adding resort:', error);
        res.status(500).json({ error: 'Failed to add resort: ' + error.message });
    }
});

app.put('/api/resorts/:id', csrfProtection, requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, location, price, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        await db().run(
            'UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, images = ?, videos = ?, amenities = ?, max_guests = ?, per_head_charge = ? WHERE id = ?',
            [name, location, parseInt(price), description, JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), parseInt(maxGuests) || 10, parseInt(perHeadCharge) || 300, id]
        );
        
        const updatedResort = { id, name, location, price: parseInt(price), description, images, videos, amenities };
        
        // Sync with other services via API Gateway
        await syncServices('resort-updated', updatedResort);
        
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
        
        // Broadcast to all connected clients
        io.emit('resortAvailabilityUpdated', { id, available });
        
        res.json({ message: 'Resort availability updated successfully' });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

app.delete('/api/resorts/:id', csrfProtection, requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const result = await db().run('DELETE FROM resorts WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        // Sync with other services via API Gateway
        await syncServices('resort-deleted', { id });
        
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        console.error('Error deleting resort:', error);
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Admin client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Admin client disconnected:', socket.id);
    });
});

// Direct service sync function
async function syncServices(action, data) {
    try {
        const services = [
            'http://localhost:3000', // Main Website
            'http://localhost:3002'  // Booking History
        ];
        
        const promises = services.map(service => 
            axios.post(`${service}/api/sync/${action.replace('-', '-')}`, data)
                .catch(e => console.log(`Sync to ${service} failed:`, e.message))
        );
        
        await Promise.all(promises);
        console.log(`Synced ${action} to all services`);
    } catch (error) {
        console.error('Service sync error:', error);
    }
}

// Sync endpoints for API Gateway
app.post('/api/sync/booking-created', (req, res) => {
    console.log('Booking sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
    io.emit('bookingCreated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-updated', (req, res) => {
    console.log('Resort update sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
    io.emit('resortUpdated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-deleted', (req, res) => {
    console.log('Resort delete sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
    io.emit('resortDeleted', req.body);
    res.json({ success: true });
});

// Proxy routes to API Gateway
const axios = require('axios');

app.post('/api/gateway/resort', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:4000/api/gateway/resort', req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/gateway/resort/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:4000/api/gateway/resort/${req.params.id}`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gateway/resort/:id', async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:4000/api/gateway/resort/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`🔧 Admin Panel running on http://localhost:${PORT}`);
    console.log(`⚡ Lambda triggers enabled`);
});