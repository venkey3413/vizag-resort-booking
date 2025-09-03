const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('booking-public'));

let bookings = [];
let nextBookingId = 1;

// API Routes
app.post('/api/bookings', (req, res) => {
    const { resortId, resortName, guestName, email, phone, checkIn, checkOut, guests, totalPrice } = req.body;
    
    const booking = {
        id: nextBookingId++,
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
    
    bookings.push(booking);
    res.json(booking);
});

app.get('/api/bookings', (req, res) => {
    res.json(bookings);
});

app.delete('/api/bookings/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const bookingIndex = bookings.findIndex(b => b.id === id);
    
    if (bookingIndex === -1) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    
    bookings.splice(bookingIndex, 1);
    res.json({ message: 'Booking deleted successfully' });
});

app.listen(PORT, () => {
    console.log(`Booking Service running on http://localhost:${PORT}`);
});