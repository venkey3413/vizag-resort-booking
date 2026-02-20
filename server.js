require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
// Use centralized database API - EC2 Docker service name
const DB_API_URL = process.env.DB_API_URL || 'http://centralized-db-api:3003';
console.log('🔗 Main server using DB API URL:', DB_API_URL);
const redisPubSub = require('./redis-pubsub');
const { sendTelegramNotification } = require('./telegram-service');
const { sendInvoiceEmail } = require('./email-service');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Input sanitization function
function sanitizeInput(input) {
    if (typeof input !== 'string') return String(input || '');
    return input.replace(/[<>"'&]/g, function(match) {
        const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
        return map[match];
    });
}

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://vshakago.in'] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(express.static('public'));

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
        const response = await fetch(`${DB_API_URL}/api/events`);
        
        if (!response.ok) {
            console.log('❌ DB API failed, returning empty array');
            return res.json([]);
        }
        
        const events = await response.json();
        console.log('🎉 Fetching events:', events.length, 'found');
        res.json(events);
    } catch (error) {
        console.error('❌ Event fetch error:', error);
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
            console.log('⚠️ DB API unavailable, using fallback');
            // Fallback: return success for admin panel
            const eventId = Date.now();
            const result = { id: eventId, message: 'Event created successfully (fallback)' };
            
            // Publish event created event via Redis
            try {
                await redisPubSub.publish('event-events', {
                    type: 'event.created',
                    event: { id: eventId, ...req.body }
                });
            } catch (eventError) {
                console.error('Redis publish failed:', eventError);
            }
            
            res.json(result);
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
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, couponCode, discountAmount, transactionId } = req.body;

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
                discountAmount: discountAmount || 0
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
                console.log('Payment proof storage failed:', error.message);
            }
            
            // Send Telegram notification
            try {
                const message = `💳 PAYMENT SUBMITTED!

📋 Booking ID: ${bookingReference}
👤 Guest: ${guestName}
🏖️ Resort: ${resort.name}
💰 Amount: ₹${totalPrice.toLocaleString()}
🔢 UTR ID: ${transactionId}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                
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
            paymentDetails: paymentDetails
        };

        // Publish booking created event via Redis
        try {
            await redisPubSub.publish('booking-events', {
                type: 'booking.created',
                bookingId: result.id,
                resortId: resortId,
                guestName: guestName,
                totalPrice: totalPrice
            });
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
        const { bookingReference, eventName, guestName, email, phone, eventDate, guests, totalPrice, transactionId } = req.body;
        
        // Send Telegram notification
        try {
            const message = `🎉 EVENT BOOKING SUBMITTED!\n\n📋 Booking ID: ${bookingReference}\n👤 Guest: ${guestName}\n🎊 Event: ${eventName}\n📅 Date: ${new Date(eventDate).toLocaleDateString()}\n👥 Guests: ${guests}\n💰 Amount: ₹${totalPrice.toLocaleString()}\n🔢 UTR ID: ${transactionId}\n⚠️ Status: Pending Verification\n\n⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
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
        console.log('🔔 Razorpay webhook received:', event.event, event.payload?.payment?.entity?.id);

        // Handle payment success
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const paymentId = payment.id;
            const amount = payment.amount / 100; // Convert from paise to rupees
            const orderId = payment.order_id;
            
            console.log('💳 Payment captured:', {
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
                console.log('⚠️ Could not match payment to booking:', {
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