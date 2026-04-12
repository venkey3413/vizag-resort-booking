require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const QRCode = require('qrcode');
const helmet = require('helmet');
const crypto = require('crypto');
const log = require('./logger');
// Use centralized database API - EC2 Docker service name
const DB_API_URL = process.env.DB_API_URL || 'http://centralized-db-api:3003';
log.info('Main server using DB API URL', { url: DB_API_URL });
const redisPubSub = require('./redis-pubsub');
const { sendTelegramNotification } = require('./telegram-service');
const { sendInvoiceEmail } = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
            frameSrc: ["'self'", "https://api.razorpay.com"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
}));

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://vshakago.in'] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Clean URL routing
app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'events.html'));
});

app.get('/owner-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'owner-dashboard.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes - all database operations via centralized API
app.get('/api/resorts', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/resorts`);
        const resorts = await response.json();
        console.log('🏨 Fetching resorts:', resorts.length, 'found');
        res.json(resorts);
    } catch (error) {
        console.error('❌ Resort fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Events endpoint
app.get('/api/events', async (req, res) => {
    try {
        console.log('🎉 Main: Fetching events from DB API:', DB_API_URL);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${DB_API_URL}/api/events`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.log('❌ DB API failed with status:', response.status);
            return res.json([]);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.log('❌ DB API returned non-JSON response:', contentType);
            return res.json([]);
        }
        
        const events = await response.json();
        console.log('🎉 Fetching events:', events.length, 'found');
        res.json(events);
    } catch (error) {
        console.error('❌ Event fetch error:', error.message);
        res.json([]);
    }
});

// Event creation endpoint (fallback for admin panel)
app.post('/api/events', async (req, res) => {
    try {
        console.log('🎉 Main: Creating event with data:', req.body);
        
        // Try centralized DB API first
        try {
            const response = await fetch(`${DB_API_URL}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Event created via DB API:', result);
                
                // Publish event created event via Redis
                try {
                    await redisPubSub.publish('event-events', {
                        type: 'event.created',
                        event: result
                    });
                } catch (eventError) {
                    console.error('Redis publish failed:', eventError);
                }
                
                return res.json(result);
            } else {
                console.log('❌ DB API failed, status:', response.status);
                throw new Error('DB API failed');
            }
        } catch (dbError) {
            console.log('❌ DB API unavailable - cannot create event:', dbError.message);
            return res.status(503).json({ error: 'Database unavailable. Please ensure the database service is running.' });
        }
    } catch (error) {
        console.error('❌ Event creation error:', error);
        res.status(500).json({ error: 'Failed to create event', details: error.message });
    }
});

// Event update endpoint
app.put('/api/events/:id', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/events/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Publish event updated event via Redis
            try {
                await redisPubSub.publish('event-events', {
                    type: 'event.updated',
                    event: result
                });
            } catch (eventError) {
                console.error('Redis publish failed:', eventError);
            }
            
            res.json(result);
        } else {
            const error = await response.json();
            res.status(response.status).json(error);
        }
    } catch (error) {
        console.error('Event update error:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// Event delete endpoint
app.delete('/api/events/:id', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/events/${req.params.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Publish event deleted event via Redis
            try {
                await redisPubSub.publish('event-events', {
                    type: 'event.deleted',
                    eventId: req.params.id
                });
            } catch (eventError) {
                console.error('Redis publish failed:', eventError);
            }
            
            res.json(result);
        } else {
            const error = await response.json();
            res.status(response.status).json(error);
        }
    } catch (error) {
        console.error('Event delete error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

app.post('/api/check-availability', async (req, res) => {
    try {
        const { resortId, checkIn, checkOut, expectedPrice } = req.body;
        
        // Get resort details from centralized API
        const resortResponse = await fetch(`${DB_API_URL}/api/resorts`);
        const resorts = await resortResponse.json();
        const resort = resorts.find(r => r.id === parseInt(resortId));
        
        if (!resort) {
            return res.status(400).json({ error: 'Resort not found' });
        }
        
        // Check if check-in date is blocked
        const blockedDatesResponse = await fetch(`${DB_API_URL}/api/blocked-dates/${resortId}`);
        const blockedDates = await blockedDatesResponse.json();
        
        if (blockedDates.includes(checkIn)) {
            return res.status(400).json({ 
                error: `This resort is not available on ${new Date(checkIn).toLocaleDateString()}. Please choose a different date.` 
            });
        }
        
        // Calculate correct pricing
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const checkInDayOfWeek = checkInDate.getDay();
        let nightlyRate = resort.price;
        
        // Apply dynamic pricing
        if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
            if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
                const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
                if (weekendPrice) nightlyRate = weekendPrice.price;
            } else {
                const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
                if (weekdayPrice) nightlyRate = weekdayPrice.price;
            }
        }
        
        const basePrice = nightlyRate * nights;
        const platformFee = Math.round(basePrice * 0.015);
        const correctTotalPrice = basePrice + platformFee;
        
        // Validate pricing if expectedPrice is provided
        if (expectedPrice && Math.abs(expectedPrice - correctTotalPrice) > 1) {
            return res.status(400).json({
                error: `Price mismatch. Expected: ₹${correctTotalPrice.toLocaleString()}, Got: ₹${expectedPrice.toLocaleString()}. Please refresh and try again.`,
                correctPrice: correctTotalPrice
            });
        }
        
        // Get bookings from centralized API to check availability
        const bookingsResponse = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsResponse.json();
        
        // Check if resort is already booked for the requested check-in date
        const paidBookingForDate = bookings.filter(b => 
            b.resort_id === parseInt(resortId) &&
            b.payment_status === 'paid' &&
            b.check_in <= checkIn && b.check_out > checkIn
        );
        
        if (paidBookingForDate.length > 0) {
            return res.status(400).json({ 
                error: `This resort is already booked for ${new Date(checkIn).toLocaleDateString()}. Please choose a different date.` 
            });
        }
        
        // Check unpaid bookings limit
        const unpaidBookingsForDate = bookings.filter(b => 
            b.resort_id === parseInt(resortId) &&
            b.check_in <= checkIn && b.check_out > checkIn &&
            b.payment_status !== 'paid'
        );
        
        if (unpaidBookingsForDate.length >= 2) {
            return res.status(400).json({ 
                error: `Maximum 2 pending bookings allowed for ${new Date(checkIn).toLocaleDateString()}. Please wait for verification or choose another date.` 
            });
        }
        
        res.json({ available: true });
    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        console.log('🎯 Booking request received:', req.body);
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, couponCode, discountAmount, transactionId, paymentStatus } = req.body;

        // Enhanced input sanitization
        const sanitizedData = {
            resortId: parseInt(resortId) || 0,
            guestName: sanitizeInput(guestName).substring(0, 100),
            email: sanitizeInput(email).substring(0, 100),
            phone: sanitizeInput(phone).substring(0, 20),
            checkIn: sanitizeInput(checkIn).substring(0, 10),
            checkOut: sanitizeInput(checkOut).substring(0, 10),
            guests: Math.max(1, Math.min(20, parseInt(guests) || 1)),
            transactionId: sanitizeInput(transactionId || '').substring(0, 50)
        };
        
        // Basic validation
        if (!sanitizedData.resortId || !sanitizedData.guestName || !sanitizedData.email || !sanitizedData.phone || !sanitizedData.checkIn || !sanitizedData.checkOut || !sanitizedData.guests) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedData.email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Phone validation
        if (!sanitizedData.phone.match(/^\+91[0-9]{10}$/)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Date validation
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const todayDate = new Date().toISOString().split('T')[0];
        
        if (checkIn < todayDate) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }
        
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ error: 'Check-out date must be at least one day after check-in date' });
        }

        // Get resort details from centralized API
        const resortResponse = await fetch(`${DB_API_URL}/api/resorts`);
        const resorts = await resortResponse.json();
        const resort = resorts.find(r => r.id === parseInt(resortId));
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }

        // Calculate pricing
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const checkInDayOfWeek = checkInDate.getDay();
        let nightlyRate = resort.price;
        
        // Use dynamic pricing from resort data
        if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
            if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
                const weekendPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekend');
                if (weekendPrice) nightlyRate = weekendPrice.price;
            } else {
                const weekdayPrice = resort.dynamic_pricing.find(p => p.day_type === 'weekday');
                if (weekdayPrice) nightlyRate = weekdayPrice.price;
            }
        }
        
        const basePrice = nightlyRate * nights;
        const platformFee = Math.round(basePrice * 0.015);
        const subtotal = basePrice + platformFee;
        const discount = discountAmount || 0;
        const totalPrice = subtotal - discount;

        // Generate booking reference
        const bookingReference = `VE${String(Date.now()).padStart(12, '0')}`;
        
        // Generate QR Code
        let qrCodeImage = '';
        try {
            qrCodeImage = await QRCode.toDataURL(bookingReference, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            console.log('✅ QR Code generated for booking:', bookingReference);
        } catch (qrError) {
            console.error('❌ QR Code generation failed:', qrError);
        }
        
        // Create booking via centralized API
        console.log('🎯 EC2 Main: Creating booking via', DB_API_URL);
        const bookingResponse = await fetch(`${DB_API_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resortId: sanitizedData.resortId,
                guestName: sanitizedData.guestName,
                email: sanitizedData.email,
                phone: sanitizedData.phone,
                checkIn: sanitizedData.checkIn,
                checkOut: sanitizedData.checkOut,
                guests: sanitizedData.guests,
                totalPrice: totalPrice,
                transactionId: sanitizedData.transactionId,
                bookingReference: bookingReference,
                couponCode: couponCode || null,
                discountAmount: discountAmount || 0,
                qrCode: qrCodeImage,
                paymentStatus: paymentStatus || 'pending' // Use provided status or default to pending
            })
        });
        
        console.log('📡 EC2 Main: Booking API response status:', bookingResponse.status);
        const result = await bookingResponse.json();
        console.log('📋 EC2 Main: Booking result:', result);
        
        if (!bookingResponse.ok || !result.id) {
            throw new Error(`Booking creation failed: ${result.error || 'Unknown error'}`);
        }
        
        // Store payment proof if transactionId provided
        if (transactionId) {
            try {
                await fetch(`${process.env.BOOKING_API_URL || 'http://booking-service:3002'}/api/payment-proofs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: result.id,
                        transactionId: transactionId
                    })
                });
            } catch (error) {
                log.warn('Payment proof storage failed', { error: error.message });
            }
            
            // Send Telegram notification based on payment status
            try {
                let message;
                if (paymentStatus === 'paid') {
                    // Razorpay payment - confirmed
                    message = `✅ PAYMENT CONFIRMED!

📋 Booking ID: ${bookingReference}
👤 Guest: ${guestName}
🏖️ Resort: ${resort.name}
💰 Amount: ₹${totalPrice.toLocaleString()}
💳 Payment ID: ${transactionId}
✅ Status: CONFIRMED

⏰ Confirmed at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                } else {
                    // UPI payment - pending verification
                    message = `💳 PAYMENT SUBMITTED!

📋 Booking ID: ${bookingReference}
👤 Guest: ${guestName}
🏖️ Resort: ${resort.name}
💰 Amount: ₹${totalPrice.toLocaleString()}
🔢 UTR ID: ${transactionId}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                }
                
                await sendTelegramNotification(message);
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }

        // Generate UPI payment details
        const paymentDetails = {
            upiId: 'venkatesh3413@paytm',
            amount: totalPrice,
            note: `Booking ${bookingReference} - ${guestName}`
        };
        
        const booking = {
            id: result.id,
            bookingReference: bookingReference,
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
            paymentDetails: paymentDetails,
            qrCode: qrCodeImage
        };

        // Publish booking created event via Redis
        try {
            await redisPubSub.publish('booking:created', JSON.stringify({
                bookingId: result.id,
                resortId: resortId,
                guestName: guestName,
                totalPrice: totalPrice
            }));
            console.log('📡 Published booking:created to Redis');
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        console.log('✅ Booking created successfully:', booking);
        res.json(booking);
    } catch (error) {
        console.error('❌ Booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.get('/api/bookings', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await response.json();
        res.json(bookings);
    } catch (error) {
        console.error('Booking fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Event bookings endpoint for Telegram notifications
app.post('/api/event-bookings', async (req, res) => {
    try {
        const { bookingReference, eventId, eventName, guestName, email, phone, eventDate, eventTime, guests, totalPrice, transactionId, paymentMethod } = req.body;

        // Save to DB via centralized API
        try {
            const dbResponse = await fetch(`${DB_API_URL}/api/event-bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    bookingReference, 
                    eventId: eventId || null, 
                    eventName, 
                    guestName, 
                    email, 
                    phone, 
                    eventDate, 
                    eventTime: eventTime || null,
                    guests, 
                    totalPrice, 
                    transactionId: transactionId || null,
                    paymentMethod: paymentMethod || 'upi'
                })
            });
            if (!dbResponse.ok) {
                const err = await dbResponse.json();
                console.error('❌ Failed to save event booking to DB:', err);
            } else {
                const result = await dbResponse.json();
                console.log('✅ Event booking saved to DB with ID:', result.id);
            }
        } catch (dbError) {
            console.error('❌ DB API unavailable for event booking:', dbError.message);
        }

        // Send Telegram notification
        try {
            const message = `🎉 EVENT BOOKING SUBMITTED!\n\n📋 Booking ID: ${bookingReference}\n👤 Guest: ${guestName}\n🎊 Event: ${eventName}\n📅 Date: ${new Date(eventDate).toLocaleDateString()}\n${eventTime ? `🕐 Time: ${eventTime}\n` : ''}👥 Guests: ${guests}\n💰 Amount: ₹${parseInt(totalPrice).toLocaleString()}\n🔢 UTR ID: ${transactionId || 'Pending'}\n⚠️ Status: Pending Verification\n\n⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }

        // Publish Redis event so admin panel updates in real-time
        try {
            await redisPubSub.publish('booking-events', {
                type: 'event.booking.created',
                bookingReference,
                guestName,
                eventName,
                eventId
            });
        } catch (redisError) {
            console.error('Redis publish failed:', redisError);
        }

        res.json({ success: true, message: 'Event booking submitted successfully' });
    } catch (error) {
        console.error('Event booking error:', error);
        res.status(500).json({ error: 'Failed to process event booking' });
    }
});

// Real-time Redis pub/sub listener endpoint
app.get('/api/events-stream', (req, res) => {
    const clientId = `main-${Date.now()}-${Math.random()}`;
    redisPubSub.subscribe(clientId, res);
    console.log('📡 Main website connected to Redis pub/sub');
});

// Blocked dates endpoint
app.get('/api/blocked-dates/:resortId', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/blocked-dates/${req.params.resortId}`);
        const blockedDates = await response.json();
        res.json(blockedDates);
    } catch (error) {
        console.error('Blocked dates fetch error:', error);
        res.json([]);
    }
});

app.post('/api/blocked-dates', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/blocked-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        
        // Publish Redis event for real-time updates
        if (response.ok) {
            try {
                await redisPubSub.publish('resort-events', {
                    type: 'resort.date.blocked',
                    data: req.body
                });
            } catch (redisError) {
                console.error('Redis publish failed:', redisError);
            }
        }
        
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to block date' });
    }
});

app.delete('/api/blocked-dates/:resortId/:blockDate', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/blocked-dates/${req.params.resortId}/${req.params.blockDate}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        // Publish Redis event for real-time updates
        if (response.ok) {
            try {
                await redisPubSub.publish('resort-events', {
                    type: 'resort.date.unblocked',
                    data: { resortId: req.params.resortId, blockDate: req.params.blockDate }
                });
            } catch (redisError) {
                console.error('Redis publish failed:', redisError);
            }
        }
        
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to unblock date' });
    }
});

// Razorpay key endpoint
app.get('/api/razorpay-key', (req, res) => {
    const key = process.env.RAZORPAY_KEY_ID;
    if (!key) {
        return res.status(500).json({ 
            error: 'Payment system not configured. Please contact support.',
            key: null 
        });
    }
    res.json({ key: key });
});

// Razorpay payment verification endpoint
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { paymentId, orderId, signature } = req.body;
        
        if (!paymentId) {
            return res.status(400).json({ verified: false, error: 'Payment ID required' });
        }

        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!razorpayKeySecret) {
            return res.status(500).json({ verified: false, error: 'Payment system not configured' });
        }

        // Verify signature if provided
        if (orderId && signature) {
            const text = `${orderId}|${paymentId}`;
            const expectedSignature = crypto
                .createHmac('sha256', razorpayKeySecret)
                .update(text)
                .digest('hex');

            if (signature !== expectedSignature) {
                return res.json({ verified: false, error: 'Invalid signature' });
            }
        }

        // Fetch payment details from Razorpay
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
        
        const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!paymentResponse.ok) {
            return res.json({ verified: false, error: 'Payment not found' });
        }

        const payment = await paymentResponse.json();
        
        // Check if payment is captured/authorized
        if (payment.status === 'captured' || payment.status === 'authorized') {
            return res.json({ 
                verified: true, 
                paymentId: payment.id,
                amount: payment.amount / 100,
                status: payment.status
            });
        } else {
            return res.json({ 
                verified: false, 
                error: `Payment status: ${payment.status}` 
            });
        }
    } catch (error) {
        console.error('❌ Payment verification error:', error);
        res.status(500).json({ verified: false, error: 'Verification failed' });
    }
});

// Razorpay webhook endpoint for automatic payment confirmation
app.post('/api/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('❌ Razorpay webhook secret not configured');
            return res.status(400).json({ error: 'Webhook not configured' });
        }

        // Verify webhook signature
        const signature = req.headers['x-razorpay-signature'];
        const body = req.body;
        
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(body.toString());
        log.info('Razorpay webhook received', { 
            event: event.event, 
            paymentId: event.payload?.payment?.entity?.id 
        });

        // Handle payment success
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const paymentId = payment.id;
            const amount = payment.amount / 100; // Convert from paise to rupees
            const orderId = payment.order_id;
            
            log.payment('Payment captured', {
                paymentId,
                amount,
                orderId,
                method: payment.method,
                status: payment.status
            });

            // Find booking by order_id or payment reference
            const bookingsResponse = await fetch(`${DB_API_URL}/api/bookings`);
            const bookings = await bookingsResponse.json();
            
            // Match booking by amount and recent timestamp (within last hour)
            const recentBookings = bookings.filter(booking => {
                const bookingTime = new Date(booking.booking_date);
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return booking.total_price === amount && 
                       bookingTime > oneHourAgo &&
                       booking.payment_status === 'pending';
            });

            if (recentBookings.length === 1) {
                const booking = recentBookings[0];
                
                // Update booking status to paid
                await fetch(`${DB_API_URL}/api/bookings/${booking.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        payment_status: 'paid',
                        transaction_id: paymentId
                    })
                });

                // Send confirmation notifications
                try {
                    const confirmationMessage = `✅ PAYMENT CONFIRMED!\n\n📋 Booking ID: ${booking.booking_reference}\n👤 Guest: ${booking.guest_name}\n💳 Transaction ID: ${paymentId}\n💳 UTR Number: ${paymentId}\n💰 Amount: ₹${amount.toLocaleString()}\n✅ Status: CONFIRMED\n\n⏰ Confirmed at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                    
                    await sendTelegramNotification(confirmationMessage);
                    
                    // Send confirmation email to customer
                    await sendInvoiceEmail({
                        to: booking.email,
                        subject: `Booking Confirmed - ${booking.booking_reference}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #28a745;">🎉 Booking Confirmed!</h2>
                                <p>Dear ${booking.guest_name},</p>
                                <p>Your payment has been successfully processed and your booking is now confirmed.</p>
                                
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3>Booking Details:</h3>
                                    <p><strong>Booking ID:</strong> ${booking.booking_reference}</p>
                                    <p><strong>Transaction ID:</strong> ${paymentId}</p>
                                    <p><strong>UTR Number:</strong> ${paymentId}</p>
                                    <p><strong>Amount Paid:</strong> ₹${amount.toLocaleString()}</p>
                                    <p><strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleDateString()}</p>
                                    <p><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString()}</p>
                                    <p><strong>Guests:</strong> ${booking.guests}</p>
                                </div>
                                
                                <p>Thank you for choosing Vizag Resorts. We look forward to hosting you!</p>
                                <p>For any queries, please contact us with your booking reference.</p>
                                
                                <hr style="margin: 30px 0;">
                                <p style="color: #666; font-size: 12px;">Vizag Resort Booking System</p>
                            </div>
                        `
                    });
                } catch (notificationError) {
                    console.error('❌ Notification sending failed:', notificationError);
                }

                console.log('✅ Booking automatically confirmed:', booking.booking_reference);
            } else {
                log.warn('Could not match payment to booking', {
                    amount,
                    recentBookingsCount: recentBookings.length,
                    paymentId
                });
            }
        }

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Coupons endpoint
app.get('/api/coupons', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/coupons?${new URLSearchParams(req.query)}`);
        const coupons = await response.json();
        res.json(coupons);
    } catch (error) {
        console.error('❌ Coupon fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// Email OTP endpoint
app.post('/api/send-email-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, error: 'Email and OTP are required' });
        }
        
        // Send OTP via email service
        await sendInvoiceEmail({
            to: email,
            subject: 'Email Verification OTP - Vizag Resorts',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">Email Verification</h2>
                    <p>Your OTP for email verification is:</p>
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #007bff; border-radius: 8px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">Vizag Resort Booking System</p>
                </div>
            `
        });
        
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('❌ Email OTP send error:', error);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
});

// Owner login endpoint
app.post('/api/owner-login', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/owner-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Owner login proxy error:', error);
        res.status(500).json({ error: 'Login service unavailable' });
    }
});

// Verify ticket endpoint for QR scanner
app.post('/api/verify-ticket', async (req, res) => {
    try {
        const { bookingReference, ownerId } = req.body;
        
        if (!bookingReference || !ownerId) {
            return res.json({ valid: false, message: 'Missing required fields' });
        }
        
        // Get booking from database
        const bookingsResponse = await fetch(`${DB_API_URL}/api/bookings`);
        const allBookings = await bookingsResponse.json();
        
        const booking = allBookings.find(b => 
            b.booking_reference === bookingReference || 
            String(b.id) === bookingReference
        );
        
        if (!booking) {
            return res.json({ valid: false, message: 'Invalid ticket - Booking not found' });
        }
        
        // Get resort details to verify owner
        const resortsResponse = await fetch(`${DB_API_URL}/api/resorts`);
        const allResorts = await resortsResponse.json();
        const resort = allResorts.find(r => r.id === booking.resort_id);
        
        if (!resort) {
            return res.json({ valid: false, message: 'Resort not found' });
        }
        
        // Get owner details to verify resort ownership
        const ownersResponse = await fetch(`${DB_API_URL}/api/owners`);
        const allOwners = await ownersResponse.json();
        const owner = allOwners.find(o => o.id == ownerId);
        
        if (!owner) {
            return res.json({ valid: false, message: 'Owner not found' });
        }
        
        // Check if resort belongs to this owner
        const ownerResortIds = owner.resort_ids ? owner.resort_ids.split(',').map(id => parseInt(id.trim())) : [];
        if (!ownerResortIds.includes(booking.resort_id)) {
            return res.json({ valid: false, message: 'Unauthorized - Not your resort' });
        }
        
        // Check payment status
        if (booking.payment_status !== 'paid') {
            return res.json({ valid: false, message: 'Payment not confirmed' });
        }
        
        // Check if already checked in
        if (booking.checked_in) {
            return res.json({ valid: false, message: 'Already used - Ticket scanned before' });
        }
        
        // Check if booking date is valid (allow check-in on check-in date)
        const checkInDate = new Date(booking.check_in);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        
        if (checkInDate < today) {
            return res.json({ valid: false, message: 'Booking expired - Check-in date passed' });
        }
        
        // Mark as checked in
        try {
            await fetch(`${DB_API_URL}/api/bookings/${booking.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checked_in: 1 })
            });
        } catch (updateError) {
            console.error('Failed to update check-in status:', updateError);
        }
        
        // Valid ticket
        res.json({
            valid: true,
            guest: booking.guest_name,
            resort: resort.name,
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            guests: booking.guests
        });
        
    } catch (error) {
        console.error('Verify ticket error:', error);
        res.status(500).json({ valid: false, message: 'Verification failed' });
    }
});

// Owners API proxy
app.get('/api/owners', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/owners`);
        const owners = await response.json();
        res.json(owners);
    } catch (error) {
        console.error('Owners fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch owners' });
    }
});

app.post('/api/owners', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/owners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Owner creation proxy error:', error);
        res.status(500).json({ error: 'Failed to create owner' });
    }
});

app.delete('/api/owners/:id', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/owners/${req.params.id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Owner deletion proxy error:', error);
        res.status(500).json({ error: 'Failed to delete owner' });
    }
});

// ── Owner Dashboard API proxies ─────────────────────────
app.get('/api/resorts/:id', async (req, res) => {
    try {
        const resp = await fetch(`${DB_API_URL}/api/resorts/${req.params.id}`);
        const data = await resp.json();
        res.status(resp.status).json(data);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch resort' }); }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const resp = await fetch(`${DB_API_URL}/api/resorts/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await resp.json();
        
        // Publish Redis event for real-time updates
        if (resp.ok) {
            try {
                await redisPubSub.publish('resort-events', {
                    type: 'resort.updated',
                    data: { resortId: req.params.id, ...req.body }
                });
            } catch (redisError) {
                console.error('Redis publish failed:', redisError);
            }
        }
        
        res.status(resp.status).json(data);
    } catch (e) { res.status(500).json({ error: 'Failed to update resort' }); }
});

app.get('/api/dynamic-pricing/:resortId', async (req, res) => {
    try {
        const resp = await fetch(`${DB_API_URL}/api/dynamic-pricing/${req.params.resortId}`);
        const data = await resp.json();
        res.status(resp.status).json(data);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch pricing' }); }
});

app.post('/api/dynamic-pricing', async (req, res) => {
    try {
        const resp = await fetch(`${DB_API_URL}/api/dynamic-pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await resp.json();
        
        // Publish Redis event for real-time updates
        if (resp.ok) {
            try {
                await redisPubSub.publish('resort-events', {
                    type: 'resort.pricing.updated',
                    data: req.body
                });
            } catch (redisError) {
                console.error('Redis publish failed:', redisError);
            }
        }
        
        res.status(resp.status).json(data);
    } catch (e) { res.status(500).json({ error: 'Failed to update pricing' }); }
});
// ────────────────────────────────────────────────────────

// Chat proxy endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch('http://chat-system:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Chat proxy error:', error);
        res.status(500).json({ error: 'Chat service unavailable' });
    }
});

// Initialize and start server
async function initServices() {
    console.log('✅ Main service initialized - using centralized database API');
}

initServices().then(async () => {
    console.log('✅ Service initialization completed successfully');
    
    // Initialize Redis connection
    try {
        await redisPubSub.connect();
        console.log('✅ Redis pub/sub connected successfully');
    } catch (error) {
        console.error('❌ Redis connection failed:', error);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Resort Booking Server running on http://0.0.0.0:${PORT}`);
    });
}).catch(error => {
    console.error('❌ Failed to start server:', error);
});
