require('dotenv').config();
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
app.use(require('cookie-parser')());
app.use(require('express-session')({
    secret: 'booking-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const csrfProtection = csrf({ cookie: false });

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

// Update payment status
app.patch('/api/bookings/:id/payment', async (req, res) => {
    try {
        const { payment_status } = req.body;
        const bookingId = req.params.id;
        
        await db.run(
            'UPDATE bookings SET payment_status = ? WHERE id = ?',
            [payment_status, bookingId]
        );
        
        // Generate and upload invoice to S3 when payment is marked as completed
        if (payment_status === 'completed') {
            try {
                console.log('Generating invoice for booking:', bookingId);
                const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
                console.log('Booking found:', !!booking);
                
                if (booking) {
                    const resort = await db.get('SELECT * FROM resorts WHERE id = ?', [booking.resort_id]);
                    console.log('Resort found:', !!resort);
                    
                    if (resort) {
                        const { generateInvoicePDF } = require('./invoice-service');
                        const invoiceUrl = await generateInvoicePDF(booking, resort);
                        console.log('Invoice uploaded to S3:', invoiceUrl);
                    } else {
                        console.error('Resort not found for booking:', booking.resort_id);
                    }
                } else {
                    console.error('Booking not found:', bookingId);
                }
            } catch (invoiceError) {
                console.error('Invoice generation failed:', invoiceError.message);
                console.error('Full error:', invoiceError);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const id = parseInt(req.params.id);
        const result = await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Get booking details before deletion for real-time sync
        const deletedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
        
        io.emit('bookingDeleted', { id });
        
        // Sync with main server to update availability
        try {
            const axios = require('axios');
            await axios.post('http://localhost:3000/api/sync/booking-deleted', {
                id,
                resort_id: deletedBooking?.resort_id
            }, {
                headers: { 'x-internal-service': 'booking-server' }
            }).catch(e => console.log('Booking deletion sync failed:', e.message));
        } catch (e) {
            console.log('Booking deletion sync error:', e.message);
        }
        
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
        console.log('Booking sync received:', req.body.id);
        io.emit('bookingCreated', req.body);
        res.json({ success: true });
    });
    
    app.post('/api/sync/resort-updated', (req, res) => {
        if (!req.headers['x-internal-service']) {
            return res.status(403).json({ error: 'Internal service calls only' });
        }
        console.log('Resort update sync received');
        io.emit('resortUpdated', req.body);
        res.json({ success: true });
    });
    
    app.post('/api/sync/resort-added', (req, res) => {
        if (!req.headers['x-internal-service']) {
            return res.status(403).json({ error: 'Internal service calls only' });
        }
        console.log('Resort added sync received');
        io.emit('resortAdded', req.body);
        res.json({ success: true });
    });
    
    app.post('/api/sync/resort-deleted', (req, res) => {
        if (!req.headers['x-internal-service']) {
            return res.status(403).json({ error: 'Internal service calls only' });
        }
        console.log('Resort deleted sync received');
        io.emit('resortDeleted', req.body);
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