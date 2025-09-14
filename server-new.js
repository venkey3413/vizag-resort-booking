require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { db, initDatabase, addBookingHistory, addTransaction } = require('./database');
const { encrypt, decrypt } = require('./crypto-utils');
const { upload } = require('./s3-config');
const { startBackupSchedule } = require('./backup-service');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests' }
}));

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Initialize
initDatabase();
startBackupSchedule();

// Input validation
const bookingValidation = [
    body('guestName').trim().isLength({ min: 2, max: 50 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').isMobilePhone(),
    body('checkIn').isISO8601(),
    body('checkOut').isISO8601(),
    body('guests').isInt({ min: 1, max: 20 })
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
};

// Get resorts
app.get('/api/resorts', async (req, res) => {
    try {
        const rows = await db().all('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => ({
            ...row,
            amenities: JSON.parse(row.amenities || '[]'),
            images: [...JSON.parse(row.images || '[]'), ...JSON.parse(row.videos || '[]')],
            videos: JSON.parse(row.videos || '[]'),
            available: Boolean(row.available)
        }));

        for (let resort of resorts) {
            const bookedDates = await db().all(
                'SELECT check_in, check_out FROM bookings WHERE resort_id = ? AND status = "confirmed"',
                [resort.id]
            );
            resort.bookedDates = bookedDates.map(booking => ({
                checkIn: booking.check_in,
                checkOut: booking.check_out
            }));

            const reviewStats = await db().get(
                'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE resort_id = ? AND approved = 1',
                [resort.id]
            );
            resort.rating = reviewStats.avg_rating || 0;
            resort.review_count = reviewStats.review_count || 0;
        }
        
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Book resort with validation
app.post('/api/bookings', bookingValidation, handleValidationErrors, async (req, res) => {
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, paymentId } = req.body;
        
        // Get resort
        const resort = await db().get('SELECT * FROM resorts WHERE id = ?', [resortId]);
        if (!resort || !resort.available) {
            return res.status(400).json({ error: 'Resort not available' });
        }

        // Check overlapping bookings
        const existingBookings = await db().all(
            'SELECT check_in, check_out FROM bookings WHERE resort_id = ? AND status = "confirmed"',
            [resortId]
        );
        
        const selectedCheckIn = new Date(checkIn);
        const selectedCheckOut = new Date(checkOut);
        const isOverlapping = existingBookings.some(booking => {
            const bookedCheckIn = new Date(booking.check_in);
            const bookedCheckOut = new Date(booking.check_out);
            return (selectedCheckIn < bookedCheckOut && selectedCheckOut > bookedCheckIn);
        });
        
        if (isOverlapping) {
            return res.status(400).json({ error: 'Selected dates are not available' });
        }

        // Calculate price
        const nights = Math.max(1, Math.ceil((selectedCheckOut - selectedCheckIn) / (1000 * 3600 * 24)));
        const bookingAmount = resort.price * nights;
        const platformFee = Math.round(bookingAmount * 0.015);
        const totalPrice = bookingAmount + platformFee;

        // Create booking
        const bookingResult = await db().run(
            'INSERT INTO bookings (resort_id, resort_name, guest_name, email, phone, check_in, check_out, guests, total_price, payment_id, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [resortId, resort.name, guestName, encrypt(email), encrypt(phone), checkIn, checkOut, guests, totalPrice, encrypt(paymentId), 'confirmed', 'pending']
        );

        const bookingId = bookingResult.lastID;
        const bookingReference = `RB${String(bookingId).padStart(4, '0')}`;

        // Add transaction and history
        await addTransaction(bookingId, paymentId, totalPrice, 'online', 'completed');
        await addBookingHistory(bookingId, 'booking_created', { guestName, email, checkIn, checkOut, guests, totalPrice });

        // Send email
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
            });

            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: email,
                subject: `Booking Confirmation - ${bookingReference}`,
                html: `<h1>Booking Confirmed!</h1><p>Booking ID: ${bookingReference}</p><p>Total: ₹${totalPrice}</p>`
            });
        } catch (emailError) {
            console.error('Email failed:', emailError.message);
        }

        // Real-time updates
        io.emit('bookingCreated', { id: bookingId, bookingReference, totalPrice });

        res.json({
            id: bookingId,
            bookingReference,
            totalPrice,
            status: 'confirmed',
            message: 'Booking successful'
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Booking failed' });
    }
});

// Other endpoints
app.get('/api/discount-codes/validate/:code', async (req, res) => {
    try {
        const discount = await db().get(
            'SELECT * FROM discount_codes WHERE code = ? AND active = 1 AND (valid_until IS NULL OR valid_until >= date("now")) AND (max_uses IS NULL OR used_count < max_uses)',
            [req.params.code.toUpperCase()]
        );
        res.json({ valid: !!discount, discount });
    } catch (error) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { resortId, guestName, rating, reviewText } = req.body;
        const result = await db().run(
            'INSERT INTO reviews (resort_id, guest_name, rating, review_text) VALUES (?, ?, ?, ?)',
            [resortId, guestName, rating, reviewText || '']
        );
        res.json({ id: result.lastID, message: 'Review submitted' });
    } catch (error) {
        res.status(500).json({ error: 'Review failed' });
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => {
    console.log(`🚀 New Secure Server running on port ${PORT}`);
});