require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const csrf = require('csurf');
const { db, initDatabase, addBookingHistory, addTransaction } = require('./database');
const { upload } = require('./s3-config');
// const { startBackupSchedule } = require('./backup-service');

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

app.get('/api/csrf-token', (req, res) => {
    try {
        const token = require('crypto').randomBytes(32).toString('hex');
        req.session.csrfToken = token;
        res.json({ token: token });
    } catch (error) {
        console.error('CSRF token error:', error);
        res.status(500).json({ error: 'Failed to generate CSRF token' });
    }
});

// Initialize database on startup
initDatabase();

// Backup schedule disabled
// startBackupSchedule();

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
        
        // Get booked dates and reviews for each resort
        for (let resort of resorts) {
            const bookedDates = await db().all(
                'SELECT check_in, check_out FROM bookings WHERE resort_id = ? AND status = "confirmed"',
                [resort.id]
            );
            
            resort.bookedDates = bookedDates.map(booking => ({
                checkIn: booking.check_in,
                checkOut: booking.check_out
            }));
            
            // Get average rating and review count
            const reviewStats = await db().get(
                'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE resort_id = ? AND approved = 1',
                [resort.id]
            );
            
            resort.rating = reviewStats.avg_rating || 0;
            resort.review_count = reviewStats.review_count || 0;
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
app.post('/api/bookings', (req, res, next) => {
    // Skip CSRF for now, add custom validation
    if (!req.headers['x-csrf-token']) {
        return res.status(403).json({ error: 'CSRF token required' });
    }
    next();
}, async (req, res) => {
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
        
        // Check for overlapping bookings
        const selectedCheckIn = new Date(checkIn);
        const selectedCheckOut = new Date(checkOut);
        
        const existingBookings = await db().all(
            'SELECT check_in, check_out FROM bookings WHERE resort_id = ? AND status = "confirmed"',
            [parseInt(resortId)]
        );
        
        const isOverlapping = existingBookings.some(booking => {
            const bookedCheckIn = new Date(booking.check_in);
            const bookedCheckOut = new Date(booking.check_out);
            return (selectedCheckIn < bookedCheckOut && selectedCheckOut > bookedCheckIn);
        });
        
        if (isOverlapping) {
            return res.status(400).json({ error: 'Selected dates are not available. Please choose different dates.' });
        }
        
        // Check for duplicate booking (same email/phone on same day)
        const today = new Date().toISOString().split('T')[0];
        const duplicateBooking = await db().get(
            'SELECT id FROM bookings WHERE (email = ? OR phone = ?) AND DATE(booking_date) = ? AND status = "confirmed"',
            [email, phone, today]
        );
        
        if (duplicateBooking) {
            return res.status(400).json({ error: 'Only one booking per day allowed with the same email or phone number' });
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
        
        // Invoice generation disabled
        
        // Send booking confirmation email
        try {
            const nodemailer = require('nodemailer');
            
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'vizagresortbooking@gmail.com',
                    pass: process.env.GMAIL_APP_PASSWORD
                }
            });
            
            const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .booking-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .label { font-weight: bold; color: #333; }
                    .value { color: #666; }
                    .total { background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
                    .payment-btn { display: inline-block; background: #25d366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏨 Booking Confirmation</h1>
                        <h2>Booking ID: ${bookingReference}</h2>
                    </div>
                    
                    <div class="content">
                        <p>Dear <strong>${guestName}</strong>,</p>
                        <p><strong>Thank you for choosing our resort! Your booking has been done to confirm the booking you need to pay within 2 hours.</strong></p>
                        
                        <div class="booking-details">
                            <h3>📋 Booking Details</h3>
                            <div class="detail-row">
                                <span class="label">Resort:</span>
                                <span class="value">${resort.name}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Location:</span>
                                <span class="value">${resort.location}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Check-in:</span>
                                <span class="value">${new Date(checkIn).toLocaleDateString()} at 11:00 AM</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Check-out:</span>
                                <span class="value">${new Date(checkOut).toLocaleDateString()} at 9:00 AM</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Guests:</span>
                                <span class="value">${guestCount}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Phone:</span>
                                <span class="value">${phone}</span>
                            </div>
                        </div>
                        
                        <div class="total">
                            <h3>💰 Total Amount: ₹${totalPrice.toLocaleString()}</h3>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="https://wa.me/918341674465?text=Hi,%20I%20want%20to%20make%20payment%20for%20booking%20${bookingReference}%20-%20Amount:%20₹${totalPrice}" class="payment-btn">
                                💳 Pay Now via WhatsApp
                            </a>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4>📝 Important Notes:</h4>
                            <ul>
                                <li>Please arrive by 11:00 AM on your check-in date</li>
                                <li>Check-out is at 9:00 AM on your departure date</li>
                                <li>Payment can be made at the resort or via WhatsApp</li>
                                <li>Contact us for any changes or cancellations</li>
                                <li>Carry a valid ID proof for check-in</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>📧 vizagresortbooking@gmail.com</p>
                        <p>Thank you for choosing our resort. We look forward to hosting you!</p>
                    </div>
                </div>
            </body>
            </html>
            `;
            
            await transporter.sendMail({
                from: 'vizagresortbooking@gmail.com',
                to: email,
                subject: `Booking Confirmation - ${bookingReference}`,
                html: emailHtml
            });
            
            console.log('Booking confirmation email sent to:', email);
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
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

// Discount code validation
app.get('/api/discount-codes/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const discount = await db().get(
            'SELECT * FROM discount_codes WHERE code = ? AND active = 1 AND (valid_until IS NULL OR valid_until >= date("now")) AND (max_uses IS NULL OR used_count < max_uses)',
            [code.toUpperCase()]
        );
        
        if (discount) {
            res.json({ valid: true, discount });
        } else {
            res.json({ valid: false, message: 'Invalid or expired discount code' });
        }
    } catch (error) {
        console.error('Error validating discount code:', error);
        res.status(500).json({ error: 'Failed to validate discount code' });
    }
});

// Submit review
app.post('/api/reviews', async (req, res) => {
    try {
        const { resortId, guestName, rating, reviewText } = req.body;
        
        const result = await db().run(
            'INSERT INTO reviews (resort_id, guest_name, rating, review_text) VALUES (?, ?, ?, ?)',
            [resortId, guestName, rating, reviewText || '']
        );
        
        res.json({ id: result.lastID, message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
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

app.post('/api/sync/booking-deleted', (req, res) => {
    if (!req.headers['x-internal-service']) {
        return res.status(403).json({ error: 'Internal service calls only' });
    }
    console.log('Booking deletion sync received:', req.body.id);
    io.emit('bookingDeleted', req.body);
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