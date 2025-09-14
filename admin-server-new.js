require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { db, initDatabase } = require('./database');
const { upload } = require('./s3-config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = 3001;

// Security middleware
app.use(helmet());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many admin requests' }
}));

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('admin-public'));

// Initialize
initDatabase();

// Input validation
const resortValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('location').trim().isLength({ min: 2, max: 100 }).escape(),
    body('price').isInt({ min: 100 }),
    body('description').trim().isLength({ max: 1000 }).escape()
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
};

// Dashboard analytics
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const totalResorts = await db().get('SELECT COUNT(*) as count FROM resorts');
        const totalBookings = await db().get('SELECT COUNT(*) as count FROM bookings');
        const totalRevenue = await db().get('SELECT SUM(total_price) as revenue FROM bookings WHERE payment_status = "completed"');
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = await db().get('SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = ?', [today]);
        
        const locationStats = await db().all(`
            SELECT r.location, COUNT(b.id) as count 
            FROM resorts r 
            LEFT JOIN bookings b ON r.id = b.resort_id 
            GROUP BY r.location 
            ORDER BY count DESC 
            LIMIT 5
        `);
        
        const recentBookings = await db().all(`
            SELECT b.guest_name, b.total_price, r.name as resort_name, b.booking_date
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC 
            LIMIT 5
        `);
        
        const monthlyRevenue = await db().all(`
            SELECT 
                strftime('%Y-%m', booking_date) as month,
                SUM(total_price) as revenue
            FROM bookings 
            WHERE payment_status = 'completed'
            AND booking_date >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', booking_date)
            ORDER BY month
        `);
        
        res.json({
            totalResorts: totalResorts.count,
            totalBookings: totalBookings.count,
            totalRevenue: totalRevenue.revenue || 0,
            todayBookings: todayBookings.count,
            locationStats,
            recentBookings,
            monthlyRevenue
        });
    } catch (error) {
        res.status(500).json({ error: 'Analytics failed' });
    }
});

// Get resorts
app.get('/api/resorts', async (req, res) => {
    try {
        const rows = await db().all('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => ({
            ...row,
            amenities: JSON.parse(row.amenities || '[]'),
            images: JSON.parse(row.images || '[]'),
            videos: JSON.parse(row.videos || '[]')
        }));
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Add resort
app.post('/api/resorts', resortValidation, handleValidationErrors, async (req, res) => {
    try {
        const { name, location, price, peakPrice, offPeakPrice, peakStart, peakEnd, description, images, videos, amenities, maxGuests, perHeadCharge, mapLink } = req.body;
        
        const result = await db().run(
            'INSERT INTO resorts (name, location, price, peak_price, off_peak_price, peak_season_start, peak_season_end, description, images, videos, amenities, available, max_guests, per_head_charge, map_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, location, price, peakPrice || null, offPeakPrice || null, peakStart || null, peakEnd || null, description || '', JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), 1, maxGuests || 10, perHeadCharge || 300, mapLink || '']
        );
        
        const newResort = { id: result.lastID, name, location, price, description, images, videos, amenities, available: true };
        io.emit('resortAdded', newResort);
        
        res.json({ id: result.lastID, message: 'Resort added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

// Update resort
app.put('/api/resorts/:id', resortValidation, handleValidationErrors, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, location, price, peakPrice, offPeakPrice, peakStart, peakEnd, description, images, videos, amenities, maxGuests, perHeadCharge, mapLink } = req.body;
        
        await db().run(
            'UPDATE resorts SET name = ?, location = ?, price = ?, peak_price = ?, off_peak_price = ?, peak_season_start = ?, peak_season_end = ?, description = ?, images = ?, videos = ?, amenities = ?, max_guests = ?, per_head_charge = ?, map_link = ? WHERE id = ?',
            [name, location, price, peakPrice || null, offPeakPrice || null, peakStart || null, peakEnd || null, description, JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), maxGuests || 10, perHeadCharge || 300, mapLink || '', id]
        );
        
        const updatedResort = { id, name, location, price, description, images, videos, amenities };
        io.emit('resortUpdated', updatedResort);
        
        res.json({ message: 'Resort updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

// Delete resort
app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db().run('DELETE FROM resorts WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        io.emit('resortDeleted', { id });
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

// Toggle availability
app.patch('/api/resorts/:id/availability', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { available } = req.body;
        
        await db().run('UPDATE resorts SET available = ? WHERE id = ?', [available ? 1 : 0, id]);
        io.emit('resortAvailabilityUpdated', { id, available });
        
        res.json({ message: 'Availability updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// Upload files
app.post('/api/upload', upload.array('media', 10), (req, res) => {
    try {
        const fileUrls = req.files.map(file => file.location);
        res.json({ urls: fileUrls });
    } catch (error) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Admin client connected:', socket.id);
    socket.on('disconnect', () => console.log('Admin client disconnected:', socket.id));
});

server.listen(PORT, () => {
    console.log(`🔧 New Secure Admin Panel running on port ${PORT}`);
});