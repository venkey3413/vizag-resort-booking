const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { publishEvent, EVENTS } = require('./eventbridge-service');
const { generatePaymentDetails } = require('./upi-service');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database
let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Add map_link column if it doesn't exist
    try {
        await db.run('ALTER TABLE resorts ADD COLUMN map_link TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add payment_status column if it doesn't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT "pending"');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add platform fee columns if they don't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN base_price INTEGER');
        await db.run('ALTER TABLE bookings ADD COLUMN platform_fee INTEGER');
    } catch (error) {
        // Columns already exist, ignore error
    }
    


    // Create tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resorts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            image TEXT,
            available INTEGER DEFAULT 1,
            map_link TEXT
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER,
            guest_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            guests INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            status TEXT DEFAULT 'pending_payment',
            booking_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS payment_proofs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            transaction_id TEXT NOT NULL,
            screenshot_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings (id)
        )
    `);

    // Insert sample resorts
    const resortCount = await db.get('SELECT COUNT(*) as count FROM resorts');
    if (resortCount.count === 0) {
        await db.run(`
            INSERT INTO resorts (name, location, price, description, image, map_link) VALUES
            ('Paradise Beach Resort', 'Goa', 5000, 'Luxury beachfront resort with stunning ocean views', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500', 'https://maps.google.com/?q=Goa'),
            ('Mountain View Resort', 'Manali', 4000, 'Peaceful mountain retreat with breathtaking views', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500', 'https://maps.google.com/?q=Manali'),
            ('Sunset Villa Resort', 'Udaipur', 6000, 'Royal heritage resort with lake views', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500', 'https://maps.google.com/?q=Udaipur')
        `);
    }
}

// Routes
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all('SELECT * FROM resorts WHERE available = 1');
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests } = req.body;

        // Basic validation
        if (!resortId || !guestName || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Get resort details
        const resort = await db.get('SELECT * FROM resorts WHERE id = ?', [resortId]);
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }

        // Calculate total price with platform fee
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const basePrice = resort.price * nights;
        const platformFee = Math.round(basePrice * 0.015); // 1.5% platform fee
        const totalPrice = basePrice + platformFee;

        // Create booking
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, base_price, platform_fee, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [resortId, guestName, email, phone, checkIn, checkOut, guests, basePrice, platformFee, totalPrice]);

        // Generate UPI payment details
        const paymentDetails = generatePaymentDetails(totalPrice, result.lastID, guestName);
        
        const booking = {
            id: result.lastID,
            bookingReference: `RB${String(result.lastID).padStart(4, '0')}`,
            resortName: resort.name,
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            guests,
            basePrice,
            platformFee,
            totalPrice,
            status: 'pending_payment',
            paymentDetails: paymentDetails
        };

        // Publish booking created event
        try {
            await publishEvent('resort.booking', EVENTS.BOOKING_CREATED, {
                bookingId: result.lastID,
                resortId: resortId,
                guestName: guestName,
                totalPrice: totalPrice
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json(booking);
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.post('/api/bookings/:id/payment-proof', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { transactionId, paymentScreenshot } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        // Update booking status to confirmed
        await db.run(
            'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
            ['confirmed', 'paid', bookingId]
        );
        
        // Store payment proof (in production, store in S3)
        await db.run(
            'INSERT OR REPLACE INTO payment_proofs (booking_id, transaction_id, screenshot_data, created_at) VALUES (?, ?, ?, datetime("now"))',
            [bookingId, transactionId, paymentScreenshot || '']
        );
        
        // Publish payment confirmed event
        try {
            await publishEvent('resort.booking', EVENTS.PAYMENT_UPDATED, {
                bookingId: bookingId,
                paymentStatus: 'paid',
                transactionId: transactionId
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ message: 'Payment confirmed successfully', status: 'confirmed' });
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});



app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC
        `);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Initialize and start server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Resort Booking Server running on http://0.0.0.0:${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
});