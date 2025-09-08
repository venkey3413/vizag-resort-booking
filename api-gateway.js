const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Razorpay = require('razorpay');
require('dotenv').config();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const app = express();
const PORT = 4000;

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
app.use(express.json());

// Service endpoints
const SERVICES = {
    main: 'http://localhost:3000',
    admin: 'http://localhost:3001', 
    booking: 'http://localhost:3002'
};

// Gateway routes - broadcast to all services
app.post('/api/gateway/booking', async (req, res) => {
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

app.post('/api/gateway/resort', async (req, res) => {
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

app.put('/api/gateway/resort/:id', async (req, res) => {
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

app.delete('/api/gateway/resort/:id', async (req, res) => {
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

// Create Razorpay order
app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;
        
        console.log('Creating Razorpay order:', { amount, currency, receipt });
        console.log('Razorpay key configured:', !!process.env.RAZORPAY_KEY_ID);
        
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay keys not configured');
        }
        
        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency,
            receipt,
            payment_capture: 1
        });
        
        console.log('Razorpay order created:', order.id);
        
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify payment and create booking
app.post('/api/payment/verify-and-book', async (req, res) => {
    try {
        const { paymentId, orderId, signature, bookingData } = req.body;
        
        // Verify payment signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(orderId + '|' + paymentId)
            .digest('hex');
        
        let paymentStatus = 'failed';
        let utrNumber = null;
        
        if (expectedSignature === signature) {
            // Payment successful
            paymentStatus = 'success';
            utrNumber = `UTR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            
            // Create booking with payment details
            bookingData.paymentId = paymentId;
            bookingData.orderId = orderId;
            bookingData.utrNumber = utrNumber;
            bookingData.paymentStatus = paymentStatus;
            
            const bookingResponse = await axios.post(`${SERVICES.main}/api/bookings`, bookingData);
            
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
                payment_status: paymentStatus,
                status: 'confirmed',
                booking_date: bookingResponse.data.bookingDate
            };
            
            // Notify other services
            await Promise.all([
                axios.post(`${SERVICES.admin}/api/sync/booking-created`, transformedBooking).catch(e => console.log('Admin sync failed:', e.message)),
                axios.post(`${SERVICES.booking}/api/sync/booking-created`, transformedBooking).catch(e => console.log('Booking sync failed:', e.message))
            ]);
            
            res.json({ success: true, booking: bookingResponse.data, utrNumber, paymentStatus });
        } else {
            // Payment failed
            res.json({ success: false, message: 'Payment verification failed', paymentStatus: 'failed' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message, paymentStatus: 'failed' });
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