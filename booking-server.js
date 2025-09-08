const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
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

app.use(cors());
app.use(express.json());
app.use(express.static('booking-public'));

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
    server.listen(PORT, () => {
        console.log(`📋 Booking History Server running on http://localhost:${PORT}`);
        console.log(`🔗 WebSocket enabled for real-time updates`);
    });
}).catch(error => {
    console.error('Failed to start booking server:', error);
    process.exit(1);
});