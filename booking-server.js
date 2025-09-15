require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { addSyncEvent } = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 3002;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('booking-public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/booking-public/index.html');
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Booking server working' });
});

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
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const bookings = await db.all(`
            SELECT b.*, r.name as resort_name, r.location 
            FROM bookings b 
            LEFT JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings: ' + error.message });
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
        
        // Get booking details before deletion
        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const result = await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Real-time sync
        io.emit('bookingDeleted', { id });
        await addSyncEvent('booking_deleted', { id, resort_id: booking.resort_id });
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

// Event polling for real-time sync
let lastEventId = 0;
async function pollSyncEvents() {
    try {
        if (!db) return;
        const rows = await db.all('SELECT * FROM sync_events WHERE id > ? ORDER BY id ASC', [lastEventId]);
        for (const event of rows) {
            lastEventId = event.id;
            const payload = JSON.parse(event.payload);
            switch (event.event_type) {
                case 'booking_created':
                    io.emit('bookingCreated', payload);
                    break;
                case 'booking_deleted':
                    io.emit('bookingDeleted', payload);
                    break;
                case 'resort_added':
                    io.emit('resortAdded', payload);
                    break;
                case 'resort_updated':
                    io.emit('resortUpdated', payload);
                    break;
                case 'resort_deleted':
                    io.emit('resortDeleted', payload);
                    break;
            }
        }
    } catch (err) {
        console.error('Error polling sync_events:', err);
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Booking client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Booking client disconnected:', socket.id);
    });
});

// Initialize and start server
initDB().then(() => {
    setInterval(pollSyncEvents, 2000);
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`📋 Booking History Server running on http://0.0.0.0:${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start booking server:', error);
    process.exit(1);
});