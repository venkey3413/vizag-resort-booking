const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const csrf = require('csurf');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 3002;

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3002'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('booking-public'));

const csrfProtection = csrf({ cookie: true });

function requireAuth(req, res, next) {
    // Skip auth for internal service-to-service calls
    if (req.headers['x-internal-service']) {
        return next();
    }
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ token: req.csrfToken() });
});

let db;

// Initialize database
async function initDB() {
    try {
        db = await open({
            filename: './resort_booking.db',
            driver: sqlite3.Database
        });
        console.log('✅ Booking server database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
}

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Booking server is working', database: db ? 'connected' : 'disconnected' });
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const bookings = await db.all('SELECT * FROM bookings ORDER BY booking_date DESC');
        console.log('Found bookings:', bookings.length);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings: ' + error.message });
    }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const transactions = await db.all('SELECT * FROM transactions ORDER BY transaction_date DESC');
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions: ' + error.message });
    }
});

// Delete booking
app.delete('/api/bookings/:id', csrfProtection, requireAuth, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const id = parseInt(req.params.id);
        const result = await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Broadcast to all connected clients
        io.emit('bookingDeleted', { id });
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Booking client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Booking client disconnected:', socket.id);
    });
});

// Initialize and start server
initDB().then(() => {
        // Sync endpoints for API Gateway
    app.post('/api/sync/booking-created', (req, res) => {
        if (!req.headers['x-internal-service']) {
            return res.status(403).json({ error: 'Internal service calls only' });
        }
        console.log('Booking sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
        io.emit('booking-created', req.body);
        res.json({ success: true });
    });
    
    app.post('/api/sync/resort-updated', requireAuth, (req, res) => {
        console.log('Resort update sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
        io.emit('resort-updated', req.body);
        res.json({ success: true });
    });
    
    app.post('/api/sync/resort-added', requireAuth, (req, res) => {
        console.log('Resort added sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
        io.emit('resort-added', req.body);
        res.json({ success: true });
    });
    
    app.post('/api/sync/resort-deleted', requireAuth, (req, res) => {
        console.log('Resort delete sync received:', JSON.stringify({ timestamp: new Date().toISOString() }));
        io.emit('resort-deleted', req.body);
        res.json({ success: true });
    });
    
    server.listen(PORT, () => {
        console.log(`📋 Booking History Server running on http://localhost:${PORT}`);
        console.log(`⚡ Lambda updates enabled`);
    });
}).catch(error => {
    console.error('Failed to start booking server:', error);
    process.exit(1);
});