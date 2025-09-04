const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('booking-public'));

// Initialize database on startup
initDatabase();

// Get all bookings with history
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db().all(`
            SELECT b.*, 
                   bh.action, 
                   bh.details, 
                   bh.created_at as history_date,
                   t.payment_method,
                   t.status as payment_status
            FROM bookings b
            LEFT JOIN booking_history bh ON b.id = bh.booking_id
            LEFT JOIN transactions t ON b.id = t.booking_id
            ORDER BY b.booking_date DESC, bh.created_at DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await db().all(`
            SELECT t.*, b.guest_name, b.resort_name
            FROM transactions t
            JOIN bookings b ON t.booking_id = b.id
            ORDER BY t.transaction_date DESC
        `);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
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