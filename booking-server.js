const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('booking-public'));

// Initialize database on startup
let dbReady = false;
initDatabase().then(() => {
    dbReady = true;
    console.log('✅ Booking server database ready');
}).catch(err => {
    console.error('❌ Booking server database error:', err);
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        if (!dbReady) {
            return res.status(503).json({ error: 'Database not ready' });
        }
        const bookings = await db().all('SELECT * FROM bookings ORDER BY booking_date DESC');
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings: ' + error.message });
    }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await db().all('SELECT * FROM transactions ORDER BY transaction_date DESC');
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions: ' + error.message });
    }
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const result = await db().run('DELETE FROM bookings WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

app.listen(PORT, () => {
    console.log(`📋 Booking History Server running on http://localhost:${PORT}`);
});