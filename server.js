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

// Get resorts from database with images
async function getResorts() {
    try {
        const [rows] = await pool.execute('SELECT * FROM resorts ORDER BY id DESC');
        
        // Get images for each resort from separate table
        for (let row of rows) {
            const [imageRows] = await pool.execute(
                'SELECT image_path FROM resort_images WHERE resort_id = ? ORDER BY image_order',
                [row.id]
            );
            
            row.images = imageRows.length > 0 ? imageRows.map(img => img.image_path) : [row.image];
            
            try {
                row.amenities = JSON.parse(row.amenities || '[]');
            } catch (e) {
                row.amenities = typeof row.amenities === 'string' ? [row.amenities] : [];
            }
        }
        
        return rows;
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
        
        if (!resort.available) {
            return res.status(400).json({ error: 'Resort is currently unavailable for booking' });
        }
        
        // Calculate total with per-head pricing (charge only after 10 guests)
        const basePrice = resort.price;
        const perHeadCharge = resort.per_head_charge || 300;
        const guestCount = parseInt(guests);
        const extraGuests = Math.max(0, guestCount - 10);
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
        
        const totalPrice = (basePrice + (extraGuests * perHeadCharge)) * nights;
        
        const [result] = await pool.execute(
            'INSERT INTO bookings (resort_id, resort_name, guest_name, email, phone, check_in, check_out, guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [parseInt(resortId), resort.name, guestName, email, phone, checkIn, checkOut, guestCount, totalPrice, 'confirmed']
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
            totalPrice: totalPrice,
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