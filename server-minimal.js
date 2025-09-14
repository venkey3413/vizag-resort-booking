require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./database');
const { encrypt, decrypt } = require('./crypto-utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initDatabase();

// Get resorts
app.get('/api/resorts', async (req, res) => {
    try {
        const rows = await db().all('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => ({
            ...row,
            amenities: JSON.parse(row.amenities || '[]'),
            images: JSON.parse(row.images || '[]'),
            videos: JSON.parse(row.videos || '[]'),
            available: Boolean(row.available)
        }));
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Book resort - NO VALIDATION
app.post('/api/bookings', async (req, res) => {
    console.log('Booking request:', req.body);
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, paymentId } = req.body;
        
        // Simple booking creation
        const bookingResult = await db().run(
            'INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, total_price, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [resortId, guestName, email, phone, checkIn, checkOut, guests, 5000, paymentId, 'confirmed']
        );
        
        const booking = {
            id: bookingResult.lastID,
            bookingReference: `RB${String(bookingResult.lastID).padStart(4, '0')}`,
            totalPrice: 5000,
            status: 'confirmed'
        };
        
        res.json(booking);
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Booking failed: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Minimal server running on port ${PORT}`);
});