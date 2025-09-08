require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const AWS = require('aws-sdk');
const { db, initDatabase, addBookingHistory, addTransaction } = require('./database');
const { upload } = require('./s3-config');

// Configure AWS Lambda
const lambda = new AWS.Lambda({
    region: process.env.AWS_REGION || 'us-east-1'
});

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
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize database on startup
initDatabase();

// Get resorts from database
async function getResorts() {
    try {
        const rows = await db().all('SELECT * FROM resorts WHERE available = 1 ORDER BY id DESC');
        
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

// Get all resorts
app.get('/api/resorts', async (req, res) => {
    const resorts = await getResorts();
    res.json(resorts);
});

// Add new resort
app.post('/api/resorts', async (req, res) => {
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
app.post('/api/bookings', async (req, res) => {
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
        
        // Calculate total with per-head pricing
        const basePrice = resort.price;
        const perHeadCharge = resort.per_head_charge || 300;
        const guestCount = parseInt(guests);
        const extraGuests = Math.max(0, guestCount - 10);
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
        
        const totalPrice = (basePrice + (extraGuests * perHeadCharge)) * nights;
        
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
        
        // Trigger Lambda function to update other services
        await triggerLambda('booking-created', booking);
        
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

// Lambda trigger function
async function triggerLambda(action, data) {
    try {
        const params = {
            FunctionName: 'booking-trigger',
            Payload: JSON.stringify({ action, data })
        };
        await lambda.invoke(params).promise();
    } catch (error) {
        console.error('Lambda trigger error:', error);
    }
}

// Sync endpoints for API Gateway
app.post('/api/sync/booking-created', (req, res) => {
    console.log('Booking sync received:', req.body);
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
    console.log(`⚡ Lambda triggers enabled`);
});