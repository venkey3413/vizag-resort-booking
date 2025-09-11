require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const csrf = require('csurf');
const { db, initDatabase, addBookingHistory, addTransaction } = require('./database');
const { upload } = require('./s3-config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(require('cookie-parser')());
app.use(require('express-session')({
    secret: 'resort-booking-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const csrfProtection = csrf({ cookie: false });

function requireAuth(req, res, next) {
    // Skip auth for internal service-to-service calls
    if (req.headers['x-internal-service']) {
        return next();
    }
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ token: req.csrfToken() });
});

// Initialize database on startup
initDatabase();

// Get resorts from database
async function getResorts() {
    try {
        const rows = await db().all('SELECT * FROM resorts ORDER BY id DESC');
        
        return rows.map(row => {
            let amenities = [];
            let images = [];
            let videos = [];
            
            try {
                amenities = JSON.parse(row.amenities || '[]');
                images = JSON.parse(row.images || '[]');
                videos = JSON.parse(row.videos || '[]');
            } catch (e) {
                amenities = [];
                images = [];
                videos = [];
            }
            
            // Combine images and videos into single media array
            const allMedia = [...images, ...videos];
            
            return {
                ...row,
                amenities,
                images: allMedia, // Frontend expects 'images' field
                videos,
                available: Boolean(row.available)
            };
        });
    } catch (error) {
        console.error('Error fetching resorts:', error);
        return [];
    }
}

// API Routes

// Upload media files to S3
app.post('/api/upload', upload.array('media', 10), (req, res) => {
    try {
        const fileUrls = req.files.map(file => file.location);
        res.json({ urls: fileUrls });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Get all resorts with availability
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await getResorts();
        
        // Get booked dates for each resort
        for (let resort of resorts) {
            const bookedDates = await db().all(
                'SELECT check_in, check_out FROM bookings WHERE resort_id = ? AND status = "confirmed"',
                [resort.id]
            );
            
            resort.bookedDates = bookedDates.map(booking => ({
                checkIn: booking.check_in,
                checkOut: booking.check_out
            }));
        }
        
        res.json(resorts);
    } catch (error) {
        console.error('Error fetching resorts:', error);
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Add new resort
app.post('/api/resorts', csrfProtection, requireAuth, async (req, res) => {
    try {
        const { name, location, price, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        const result = await db().run(
            'INSERT INTO resorts (name, location, price, description, images, videos, amenities, max_guests, per_head_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, location, price, description, JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), maxGuests || 10, perHeadCharge || 300]
        );
        
        res.json({ id: result.lastID, message: 'Resort added successfully' });
    } catch (error) {
        console.error('Error adding resort:', error);
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

// Book a resort
app.post('/api/bookings', csrfProtection, async (req, res) => {
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, paymentId } = req.body;
        
        const resorts = await getResorts();
        const resort = resorts.find(r => r.id === parseInt(resortId));
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        if (!resort.available) {
            return res.status(400).json({ error: 'Resort is currently unavailable for booking' });
        }
        
        // Calculate total price
        const basePrice = resort.price;
        const guestCount = parseInt(guests);
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
        
        const bookingAmount = basePrice * nights;
        const platformFee = Math.round(bookingAmount * 0.015);
        const totalPrice = bookingAmount + platformFee;
        
        // Create booking
        const bookingResult = await db().run(
            'INSERT INTO bookings (resort_id, resort_name, guest_name, email, phone, check_in, check_out, guests, total_price, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [parseInt(resortId), resort.name, guestName, email, phone, checkIn, checkOut, guestCount, totalPrice, paymentId, 'confirmed']
        );
        
        const bookingId = bookingResult.lastID;
        
        // Add transaction record
        await addTransaction(bookingId, paymentId, totalPrice, 'online', 'completed');
        
        // Add booking history
        await addBookingHistory(bookingId, 'booking_created', {
            guestName,
            email,
            checkIn,
            checkOut,
            guests: guestCount,
            totalPrice
        });
        
        const bookingReference = `RB${String(bookingId).padStart(4, '0')}`;
        
        const booking = {
            id: bookingId,
            bookingReference,
            resortId: parseInt(resortId),
            resortName: resort.name,
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            guests: guestCount,
            totalPrice,
            paymentId,
            status: 'confirmed',
            bookingDate: new Date().toISOString()
        };
        
        // Real-time sync to booking history service
        try {
            const axios = require('axios');
            await axios.post('http://localhost:3002/api/sync/booking-created', {
                id: bookingId,
                resort_id: parseInt(resortId),
                resort_name: resort.name,
                guest_name: guestName,
                email,
                phone,
                check_in: checkIn,
                check_out: checkOut,
                guests: guestCount,
                total_price: totalPrice,
                payment_id: paymentId,
                status: 'confirmed',
                booking_date: new Date().toISOString()
            }, {
                headers: { 'x-internal-service': 'main-server' }
            }).catch(e => console.log('Booking sync failed:', e.message));
        } catch (e) {
            console.log('Booking sync error:', e.message);
        }
        
        // Emit real-time update
        io.emit('bookingCreated', booking);
        
        res.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Get booking history
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db().all(`
            SELECT b.*, bh.action, bh.details, bh.created_at as history_date
            FROM bookings b
            LEFT JOIN booking_history bh ON b.id = bh.booking_id
            ORDER BY b.booking_date DESC, bh.created_at DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get transaction history
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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});



// Sync endpoints for API Gateway (internal calls only)
app.post('/api/sync/booking-created', (req, res) => {
    if (!req.headers['x-internal-service']) {
        return res.status(403).json({ error: 'Internal service calls only' });
    }
    console.log('Booking sync received:', JSON.stringify({ id: req.body.id, status: req.body.status }));
    io.emit('bookingCreated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-updated', (req, res) => {
    console.log('Resort update sync received:', req.body);
    io.emit('resortUpdated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-added', (req, res) => {
    console.log('Resort added sync received:', req.body);
    io.emit('resortAdded', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-updated', (req, res) => {
    console.log('Resort update sync received:', req.body);
    io.emit('resortUpdated', req.body);
    res.json({ success: true });
});

app.post('/api/sync/resort-deleted', (req, res) => {
    console.log('Resort delete sync received:', req.body);
    io.emit('resortDeleted', req.body);
    res.json({ success: true });
});

// Proxy routes to API Gateway
app.post('/api/gateway/booking', async (req, res) => {
    try {
        const axios = require('axios');
        const response = await axios.post('http://localhost:4000/api/gateway/booking', req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



server.listen(PORT, () => {
    console.log(`🚀 Resort Booking Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:3001`);
    console.log(`📋 Booking History: http://localhost:3002`);
    console.log(`☁️  S3 Bucket: ${process.env.S3_BUCKET}`);
    console.log(`🌐 API Gateway sync enabled`);
});