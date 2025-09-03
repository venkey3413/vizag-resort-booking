const express = require('express');
const cors = require('cors');
const { pool, initDatabase } = require('./database');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('booking-public'));

// Initialize database on startup
initDatabase();

// API Routes
app.post('/api/bookings', async (req, res) => {
    try {
        const { resortId, resortName, guestName, email, phone, checkIn, checkOut, guests, totalPrice } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO bookings (resort_id, resort_name, guest_name, email, phone, check_in, check_out, guests, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [parseInt(resortId), resortName, guestName, email, phone, checkIn, checkOut, parseInt(guests), totalPrice]
        );
        
        const booking = {
            id: result.insertId,
            resortId: parseInt(resortId),
            resortName,
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            guests: parseInt(guests),
            totalPrice,
            status: 'confirmed',
            bookingDate: new Date().toISOString()
        };
        
        res.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.get('/api/bookings', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM bookings ORDER BY id DESC');
        const bookings = rows.map(row => ({
            id: row.id,
            resortId: row.resort_id,
            resortName: row.resort_name,
            guestName: row.guest_name,
            email: row.email,
            phone: row.phone,
            checkIn: row.check_in,
            checkOut: row.check_out,
            guests: row.guests,
            totalPrice: row.total_price,
            status: row.status,
            bookingDate: row.booking_date
        }));
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const [result] = await pool.execute('DELETE FROM bookings WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

app.listen(PORT, () => {
    console.log(`Booking Service running on http://localhost:${PORT}`);
});