const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Razorpay = require('razorpay');
const csrf = require('csurf');
const PaymentService = require('./payment-service');
require('dotenv').config();

// Initialize Razorpay
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
    process.exit(1);
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const paymentService = new PaymentService();

const app = express();
const PORT = 4000;

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
app.use(express.json());

const csrfProtection = csrf({ cookie: true });

function requireAuth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ token: req.csrfToken() });
});

// Service endpoints
const SERVICES = {
    main: 'http://localhost:3000',
    admin: 'http://localhost:3001', 
    booking: 'http://localhost:3002'
};

// Gateway routes - broadcast to all services
app.post('/api/gateway/booking', csrfProtection, async (req, res) => {
    try {
        // Create booking in main service
        const bookingResponse = await axios.post(`${SERVICES.main}/api/bookings`, req.body);
        
        // Transform booking data for database schema
        const transformedBooking = {
            id: bookingResponse.data.id,
            resort_id: bookingResponse.data.resortId,
            resort_name: bookingResponse.data.resortName,
            guest_name: bookingResponse.data.guestName,
            email: bookingResponse.data.email,
            phone: bookingResponse.data.phone,
            check_in: bookingResponse.data.checkIn,
            check_out: bookingResponse.data.checkOut,
            guests: bookingResponse.data.guests,
            total_price: bookingResponse.data.totalPrice,
            payment_id: bookingResponse.data.paymentId,
            status: bookingResponse.data.status,
            booking_date: bookingResponse.data.bookingDate
        };
        
        // Notify other services with transformed data
        await Promise.all([
            axios.post(`${SERVICES.admin}/api/sync/booking-created`, transformedBooking).catch(e => console.log('Admin sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/booking-created`, transformedBooking).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(bookingResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/gateway/resort', csrfProtection, requireAuth, async (req, res) => {
    try {
        // Create/update resort in admin service
        const resortResponse = await axios.post(`${SERVICES.admin}/api/resorts`, req.body);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.main}/api/sync/resort-updated`, req.body).catch(e => console.log('Main sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/resort-updated`, req.body).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(resortResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/gateway/resort/:id', csrfProtection, requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        
        // Update resort in admin service
        const resortResponse = await axios.put(`${SERVICES.admin}/api/resorts/${id}`, req.body);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.main}/api/sync/resort-updated`, { id, ...req.body }).catch(e => console.log('Main sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/resort-updated`, { id, ...req.body }).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(resortResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gateway/resort/:id', csrfProtection, requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        
        // Delete resort in admin service
        const resortResponse = await axios.delete(`${SERVICES.admin}/api/resorts/${id}`);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.main}/api/sync/resort-deleted`, { id }).catch(e => console.log('Main sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/resort-deleted`, { id }).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(resortResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Resort Booking API Gateway',
        version: '1.0.0',
        services: SERVICES,
        endpoints: {
            'POST /api/gateway/booking': 'Create booking',
            'POST /api/gateway/resort': 'Add resort',
            'PUT /api/gateway/resort/:id': 'Update resort',
            'DELETE /api/gateway/resort/:id': 'Delete resort',
            'GET /health': 'Health check'
        }
    });
});

// Create Razorpay order with validation
app.post('/api/payment/create-order', csrfProtection, async (req, res) => {
    try {
        const { amount, bookingData } = req.body;
        
        // Validate amount
        if (!amount || amount <= 0 || amount > 500000) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        // Validate booking data
        const { resortId, guestName, email, phone, checkIn, checkOut, guests } = bookingData;
        
        if (!resortId || !guestName || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'Missing required booking information' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Validate phone format
        if (!/^\+91[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone format' });
        }
        
        // Validate dates
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();
        
        if (checkInDate < today || checkOutDate <= checkInDate) {
            return res.status(400).json({ error: 'Invalid dates' });
        }
        
        const receipt = `booking_${Date.now()}_${resortId}`;
        const orderResult = await paymentService.createOrder(amount, 'INR', receipt);
        
        if (!orderResult.success) {
            return res.status(500).json({ error: orderResult.error });
        }
        
        res.json({
            orderId: orderResult.orderId,
            amount: orderResult.amount,
            currency: orderResult.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Payment order creation error:', error.message);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

// Verify payment and create booking with enhanced security
app.post('/api/payment/verify-and-book', csrfProtection, async (req, res) => {
    try {
        const { paymentId, orderId, signature, bookingData } = req.body;
        
        // Validate required fields
        if (!paymentId || !orderId || !signature || !bookingData) {
            return res.status(400).json({ error: 'Missing required payment data' });
        }
        
        // Verify payment signature using service
        const isValidPayment = paymentService.verifyPayment(orderId, paymentId, signature);
        
        if (!isValidPayment) {
            return res.status(400).json({ error: 'Invalid payment signature', paymentStatus: 'failed' });
        }
        
        // Get payment details from Razorpay
        const paymentDetails = await paymentService.getPaymentDetails(paymentId);
        
        if (!paymentDetails.success || paymentDetails.payment.status !== 'captured') {
            return res.status(400).json({ error: 'Payment not successful', paymentStatus: 'failed' });
        }
        
        // Generate UTR number
        const utrNumber = `UTR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Create booking with payment details
        const enhancedBookingData = {
            ...bookingData,
            paymentId,
            orderId,
            utrNumber,
            paymentStatus: 'completed',
            paymentMethod: paymentDetails.payment.method
        };
        
        const bookingResponse = await axios.post(`${SERVICES.main}/api/bookings`, enhancedBookingData);
        
        // Transform and sync booking data
        const transformedBooking = {
            id: bookingResponse.data.id,
            resort_id: bookingResponse.data.resortId,
            resort_name: bookingResponse.data.resortName,
            guest_name: bookingResponse.data.guestName,
            email: bookingResponse.data.email,
            phone: bookingResponse.data.phone,
            check_in: bookingResponse.data.checkIn,
            check_out: bookingResponse.data.checkOut,
            guests: bookingResponse.data.guests,
            total_price: bookingResponse.data.totalPrice,
            payment_id: paymentId,
            order_id: orderId,
            utr_number: utrNumber,
            payment_status: 'completed',
            payment_method: paymentDetails.payment.method,
            status: 'confirmed',
            booking_date: bookingResponse.data.bookingDate
        };
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.admin}/api/sync/booking-created`, transformedBooking).catch(e => console.log('Admin sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/booking-created`, transformedBooking).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json({ 
            success: true, 
            booking: bookingResponse.data, 
            utrNumber, 
            paymentStatus: 'completed',
            paymentMethod: paymentDetails.payment.method
        });
    } catch (error) {
        console.error('Payment verification error:', error.message);
        res.status(500).json({ error: 'Payment verification failed', paymentStatus: 'failed' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway running', services: SERVICES });
});

app.listen(PORT, () => {
    console.log(`🌐 API Gateway running on http://localhost:${PORT}`);
    console.log(`📡 Routing to services:`, SERVICES);
});