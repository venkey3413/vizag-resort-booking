const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Get resorts from admin service
async function getResorts() {
    try {
        const response = await fetch('http://localhost:3001/api/resorts');
        return await response.json();
    } catch (error) {
        console.error('Error fetching resorts:', error);
        return [];
    }
}

// API Routes

// Get all resorts
app.get('/api/resorts', async (req, res) => {
    const resorts = await getResorts();
    res.json(resorts);
});

// Book a resort
app.post('/api/bookings', async (req, res) => {
    const { resortId, guestName, email, phone, checkIn, checkOut, guests } = req.body;
    
    const resorts = await getResorts();
    const resort = resorts.find(r => r.id === parseInt(resortId));
    if (!resort) {
        return res.status(404).json({ error: 'Resort not found' });
    }
    
    const bookingData = {
        resortId: parseInt(resortId),
        resortName: resort.name,
        guestName,
        email,
        phone,
        checkIn,
        checkOut,
        guests: parseInt(guests),
        totalPrice: resort.price * parseInt(guests)
    };
    
    try {
        const response = await fetch('http://localhost:3002/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const booking = await response.json();
        res.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.listen(PORT, () => {
    console.log(`Main App running on http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:3001`);
    console.log(`Booking History: http://localhost:3002`);
});