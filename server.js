const express = require('express');
const cors = require('cors');
const { pool, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize database on startup
initDatabase();

// Get resorts from database
async function getResorts() {
    try {
        const [rows] = await pool.execute('SELECT * FROM resorts ORDER BY id DESC');
        return rows.map(row => {
            let amenities = [];
            try {
                amenities = JSON.parse(row.amenities || '[]');
            } catch (e) {
                amenities = typeof row.amenities === 'string' ? [row.amenities] : [];
            }
            return {
                ...row,
                amenities
            };
        });
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
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests } = req.body;
        
        const resorts = await getResorts();
        const resort = resorts.find(r => r.id === parseInt(resortId));
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO bookings (resort_id, resort_name, guest_name, email, phone, check_in, check_out, guests, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [parseInt(resortId), resort.name, guestName, email, phone, checkIn, checkOut, parseInt(guests), resort.price * parseInt(guests)]
        );
        
        const booking = {
            id: result.insertId,
            resortId: parseInt(resortId),
            resortName: resort.name,
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            guests: parseInt(guests),
            totalPrice: resort.price * parseInt(guests),
            status: 'confirmed',
            bookingDate: new Date().toISOString()
        };
        
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