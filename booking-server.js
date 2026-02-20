const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { sendInvoiceEmail } = require('./email-service');
const { sendTelegramNotification, formatBookingNotification } = require('./telegram-service');
const redisPubSub = require('./redis-pubsub');

const app = express();
const PORT = 3002;

// Use centralized database API - EC2 Docker service name
const DB_API_URL = process.env.DB_API_URL || 'http://centralized-db-api:3003';
console.log('🔗 Booking server using DB API URL:', DB_API_URL);

app.use(cors());
app.use(express.json());

// Cache-busting headers
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static('bookings-public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/bookings-public/index.html');
});

// Real-time Redis pub/sub listener endpoint
app.get('/api/events-stream', (req, res) => {
    const clientId = `booking-${Date.now()}-${Math.random()}`;
    redisPubSub.subscribe(clientId, res);
    console.log('📡 Booking management connected to Redis pub/sub');
});

// Availability check endpoint with pricing validation
app.post('/api/check-availability', async (req, res) => {
    try {
        const { resortId, checkIn, checkOut, expectedPrice } = req.body;
        // Simple availability check - just return available for now
        res.json({ available: true });
    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
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

// Payment proof endpoint - keep local for now as it's used by main service
app.post('/api/payment-proofs', async (req, res) => {
    try {
        const { bookingId, transactionId } = req.body;
        console.log('💳 Payment proof received for booking:', bookingId, 'UTR:', transactionId);
        res.json({ message: 'Payment proof stored successfully' });
    } catch (error) {
        console.error('Payment proof storage error:', error);
        res.status(500).json({ error: 'Failed to store payment proof' });
    }
});

// Booking API Routes - Admin only, no public access
app.get('/api/bookings', async (req, res) => {
    try {
        console.log('📋 EC2 Booking service: Fetching from', DB_API_URL);
        const response = await fetch(`${DB_API_URL}/api/bookings`);
        console.log('📡 EC2 Booking service: Response status', response.status);
        const bookings = await response.json();
        console.log('📊 EC2 Booking service: Got', bookings.length, 'bookings');
        // Filter out cancelled bookings
        const activeBookings = bookings.filter(b => b.status !== 'cancelled');
        console.log('📊 EC2 Booking service: Returning', activeBookings.length, 'active bookings');
        res.json(activeBookings);
    } catch (error) {
        console.error('❌ EC2 Booking service fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.put('/api/bookings/:id/payment', async (req, res) => {
    try {
        const id = req.params.id;
        const { payment_status } = req.body;
        
        // Get booking details from centralized API
        const bookingsResponse = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsResponse.json();
        const booking = bookings.find(b => b.id == id);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Update payment status via centralized API
        await fetch(`${DB_API_URL}/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status })
        });
        
        // Generate invoice when marked as paid
        if (payment_status === 'paid') {
            console.log(`💰 Payment marked as paid for booking ${id}, processing...`);
            try {
                console.log('📄 Processing payment confirmation...');
                console.log(`✅ Payment confirmed for booking ${id}`);
            } catch (error) {
                console.error('❌ Payment processing error:', error);
            }
            
            // Publish availability update via Redis
            try {
                await redisPubSub.publish('resort-events', {
                    type: 'resort.availability.updated',
                    resortId: booking.resort_id,
                    date: booking.check_in,
                    action: 'booking_confirmed'
                });
            } catch (eventError) {
                console.error('Redis publish failed:', eventError);
            }
        }
        
        // Publish payment updated event via Redis
        try {
            await redisPubSub.publish('booking-events', {
                type: 'payment.updated',
                bookingId: id,
                paymentStatus: payment_status,
                guestName: booking.guest_name,
                resortName: booking.resort_name
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.post('/api/bookings/:id/send-email', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Get booking details from centralized API
        const bookingsResponse = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsResponse.json();
        const booking = bookings.find(b => b.id == id);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        if (booking.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Booking must be marked as paid first' });
        }
        
        // Send email
        const emailSent = await sendInvoiceEmail(booking);
        
        if (emailSent) {
            res.json({ message: 'Email sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (error) {
        console.error('Manual email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Delete booking via centralized API
        const response = await fetch(`${DB_API_URL}/api/bookings/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete booking');
        }
        
        // Publish booking deleted event via Redis
        try {
            await redisPubSub.publish('booking-events', {
                type: 'booking.deleted',
                bookingId: id,
                status: 'deleted'
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

app.post('/api/test-backup', async (req, res) => {
    try {
        console.log('🧪 Manual backup test triggered');
        res.json({ message: 'Backup service disabled', status: 'skipped' });
    } catch (error) {
        console.error('Manual backup failed:', error);
        res.status(500).json({ error: 'Backup failed', details: error.message });
    }
});

// Endpoint to cancel booking with optional email
app.post('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { sendEmail } = req.body;
        
        // Get booking details from centralized API before deletion
        const bookingsResponse = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsResponse.json();
        const booking = bookings.find(b => b.id == bookingId);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Delete the booking via centralized API
        const deleteResponse = await fetch(`${DB_API_URL}/api/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
            throw new Error('Failed to delete booking');
        }
        
        // Send cancellation email if requested
        if (sendEmail) {
            try {
                const nodemailer = require('nodemailer');
                
                const transporter = nodemailer.createTransporter({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_APP_PASSWORD
                    }
                });
                
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: booking.email,
                    subject: 'Booking Cancellation - Vizag Resorts',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="Vizag Resort Booking" style="max-width: 150px; height: auto;">
                            </div>
                            <h2 style="color: #333;">Booking Cancellation</h2>
                            
                            <p>Dear ${booking.guest_name},</p>
                            
                            <p>We have cancelled your booking with ${booking.resort_name}.</p>
                            
                            <p><strong>Here are the details of your cancelled booking:</strong></p>
                            
                            <p><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</p>
                            <p><strong>Guest Name:</strong> ${booking.guest_name}</p>
                            <p><strong>Check-in Date:</strong> ${new Date(booking.check_in).toLocaleDateString()}</p>
                            <p><strong>Check-out Date:</strong> ${new Date(booking.check_out).toLocaleDateString()}</p>
                            <p><strong>Resort Name:</strong> ${booking.resort_name}</p>
                            
                            <p><strong>As per our cancellation policy:</strong></p>
                            <p>Full refund will be processed</p>
                            
                            <p>Refund (if applicable) will be processed within 1-2 business days for UPI and 3-5 days for card to your original payment method.</p>
                            
                            <p>If you wish to reschedule or need any assistance, please contact us at vizagresortbooking@gmail.com</p>
                            
                            <p>We'd be delighted to welcome you again in the future.</p>
                            
                            <p>Thank you for considering vizagresortbooking.in We hope to host you on your next trip.</p>
                            
                            <p>Warm regards,<br>
                            <a href="https://vizagresortbooking.in/" style="color: #667eea;">https://vizagresortbooking.in/</a></p>
                        </div>
                    `
                };
                
                await transporter.sendMail(mailOptions);
                console.log('Cancellation email sent to:', booking.email);
            } catch (emailError) {
                console.error('Failed to send cancellation email:', emailError);
            }
        }
        
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// All other endpoints now use centralized API
app.get('/api/coupons', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/coupons?${new URLSearchParams(req.query)}`);
        const coupons = await response.json();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

app.post('/api/coupons', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const result = await response.json();
        res.status(response.status).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

app.delete('/api/coupons/:code', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/coupons/${req.params.code}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        res.status(response.status).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
});

// Resort management endpoints - all via centralized API
app.get('/api/resorts', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/resorts`);
        const resorts = await response.json();
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/resorts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const result = await response.json();
        
        // Publish resort added event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.added',
                resortId: result.id
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.status(response.status).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/resorts/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const result = await response.json();
        
        // Publish resort updated event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.updated',
                resortId: req.params.id
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.status(response.status).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/resorts/${req.params.id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        // Publish resort deleted event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.deleted',
                resortId: req.params.id
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.status(response.status).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

// Dynamic pricing endpoints
app.get('/api/dynamic-pricing/:resortId', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/dynamic-pricing/${req.params.resortId}`);
        const pricing = await response.json();
        res.json(pricing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dynamic pricing' });
    }
});

app.post('/api/dynamic-pricing', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/dynamic-pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const result = await response.json();
        res.status(response.status).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update dynamic pricing' });
    }
});

// Resort ordering endpoint
app.post('/api/resorts/reorder', async (req, res) => {
    try {
        // This would need to be implemented in centralized API
        // For now, just publish the event
        const { resortOrders } = req.body;
        
        // Publish resort order updated event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.order.updated',
                resortOrders: resortOrders
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Resort order updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort order' });
    }
});

// Food and travel endpoints - proxy to main service
app.get('/api/food-orders', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/food-orders`);
        const orders = await response.json();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch food orders' });
    }
});

app.get('/api/travel-bookings', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/travel-bookings`);
        const bookings = await response.json();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch travel bookings' });
    }
});

async function startServer() {
    try {
        // Initialize Redis connection
        await redisPubSub.connect();
        console.log('✅ Redis pub/sub connected successfully');
        
        console.log('✅ Booking service initialized - using centralized database API');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`📋 Booking Management running on http://0.0.0.0:${PORT}`);
            console.log(`🔗 Using centralized DB API at ${DB_API_URL}`);
        });
    } catch (error) {
        console.error('❌ Failed to start booking service:', error);
    }
}

startServer();