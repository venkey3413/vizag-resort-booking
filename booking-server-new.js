require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = 3002;

// Security middleware
app.use(helmet());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many booking management requests' }
}));

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('booking-public'));

let db;

// Initialize database
async function initDB() {
    try {
        db = await open({
            filename: './data/resort_booking.db',
            driver: sqlite3.Database
        });
        console.log('✅ Booking server database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
}

// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        if (!db) return res.status(503).json({ error: 'Database not connected' });
        const bookings = await db.all('SELECT * FROM bookings ORDER BY booking_date DESC');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
    try {
        if (!db) return res.status(503).json({ error: 'Database not connected' });
        const transactions = await db.all('SELECT * FROM transactions ORDER BY transaction_date DESC');
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Update payment status
app.patch('/api/bookings/:id/payment', async (req, res) => {
    try {
        const { payment_status } = req.body;
        const bookingId = req.params.id;
        
        await db.run(
            'UPDATE bookings SET payment_status = ? WHERE id = ?',
            [payment_status, bookingId]
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        if (!db) return res.status(503).json({ error: 'Database not connected' });
        
        const id = parseInt(req.params.id);
        const result = await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        io.emit('bookingDeleted', { id });
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

// Sync endpoints for internal communication
app.post('/api/sync/booking-created', (req, res) => {
    if (!req.headers['x-internal-service']) {
        return res.status(403).json({ error: 'Internal service calls only' });
    }
    console.log('Booking sync received:', req.body.id);
    io.emit('bookingCreated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-updated', (req, res) => {
    if (!req.headers['x-internal-service']) {
        return res.status(403).json({ error: 'Internal service calls only' });
    }
    io.emit('resortUpdated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-added', (req, res) => {
    if (!req.headers['x-internal-service']) {
        return res.status(403).json({ error: 'Internal service calls only' });
    }
    io.emit('resortAdded', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-deleted', (req, res) => {
    if (!req.headers['x-internal-service']) {
        return res.status(403).json({ error: 'Internal service calls only' });
    }
    io.emit('resortDeleted', req.body);
    res.json({ success: true });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Booking client connected:', socket.id);
    socket.on('disconnect', () => console.log('Booking client disconnected:', socket.id));
});

// Initialize and start
initDB().then(() => {
    server.listen(PORT, () => {
        console.log(`📋 New Secure Booking Server running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start booking server:', error);
    process.exit(1);
});