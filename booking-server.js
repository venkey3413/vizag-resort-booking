const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const { sendInvoiceEmail } = require('./email-service');
const { sendTelegramNotification } = require('./telegram-service');
const redisPubSub = require('./redis-pubsub');

const app = express();
const PORT = 3002;

const DB_API_URL = process.env.DB_API_URL || 'http://centralized-db-api:3003';
console.log('🔗 Booking server using DB API URL:', DB_API_URL);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static('bookings-public'));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/bookings-public/index.html');
});

app.get('/api/events-stream', (req, res) => {
    const clientId = `booking-${Date.now()}-${Math.random()}`;
    redisPubSub.subscribe(clientId, res);
});

// ─── RESORT BOOKINGS ─────────────────────────────────────────────────────────

app.get('/api/bookings', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await response.json();
        res.json(bookings);
    } catch (error) {
        console.error('Bookings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Confirm resort booking — marks as paid + sends email + WhatsApp
app.post('/api/bookings/:id/confirm', async (req, res) => {
    try {
        const id = req.params.id;

        // Get booking
        const bookingsRes = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsRes.json();
        const booking = bookings.find(b => b.id == id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Update status to paid
        await fetch(`${DB_API_URL}/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status: 'paid', status: 'confirmed' })
        });

        // Send confirmation email
        let emailSent = false;
        try {
            emailSent = await sendInvoiceEmail(booking, 'resort');
        } catch (e) { console.error('Email failed:', e.message); }

        // Send WhatsApp via wa.me link (generate URL for admin to click)
        const whatsappMsg = `✅ Booking Confirmed!\n\nBooking ID: ${booking.booking_reference}\nGuest: ${booking.guest_name}\nResort: ${booking.resort_name}\nCheck-in: ${new Date(booking.check_in).toLocaleDateString()}\nCheck-out: ${new Date(booking.check_out).toLocaleDateString()}\nAmount: ₹${parseInt(booking.total_price).toLocaleString()}\n\nYour booking is confirmed. We look forward to welcoming you!`;
        const whatsappUrl = `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

        // Redis publish
        try {
            await redisPubSub.publish('booking-events', { type: 'booking.confirmed', bookingId: id });
        } catch (e) {}

        res.json({ success: true, emailSent, whatsappUrl });
    } catch (error) {
        console.error('Confirm booking error:', error);
        res.status(500).json({ error: 'Failed to confirm booking' });
    }
});

// Cancel resort booking — marks cancelled + sends email + WhatsApp
app.post('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const id = req.params.id;

        const bookingsRes = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsRes.json();
        const booking = bookings.find(b => b.id == id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Update status to cancelled
        await fetch(`${DB_API_URL}/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status: 'cancelled', status: 'cancelled' })
        });

        // Send cancellation email
        let emailSent = false;
        try {
            const transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: booking.email,
                subject: 'Booking Cancellation - Vizag Resorts',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #dc3545;">Booking Cancelled</h2>
                        <p>Dear ${booking.guest_name},</p>
                        <p>Your booking has been cancelled.</p>
                        <p><strong>Booking ID:</strong> ${booking.booking_reference}</p>
                        <p><strong>Resort:</strong> ${booking.resort_name}</p>
                        <p><strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleDateString()}</p>
                        <p><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString()}</p>
                        <p>Refund (if applicable) will be processed within 3-5 business days.</p>
                        <p>For any queries, contact us at vizagresortbooking@gmail.com</p>
                        <p>Warm regards,<br>Vizag Resort Booking Team</p>
                    </div>
                `
            });
            emailSent = true;
        } catch (e) { console.error('Cancel email failed:', e.message); }

        const whatsappMsg = `❌ Booking Cancelled\n\nBooking ID: ${booking.booking_reference}\nGuest: ${booking.guest_name}\nResort: ${booking.resort_name}\nCheck-in: ${new Date(booking.check_in).toLocaleDateString()}\n\nYour booking has been cancelled. Refund (if applicable) will be processed within 3-5 business days.\n\nFor queries: vizagresortbooking@gmail.com`;
        const whatsappUrl = `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

        try {
            await redisPubSub.publish('booking-events', { type: 'booking.cancelled', bookingId: id });
        } catch (e) {}

        res.json({ success: true, emailSent, whatsappUrl });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Resend confirmation email for resort booking
app.post('/api/bookings/:id/send-email', async (req, res) => {
    try {
        const id = req.params.id;
        const bookingsRes = await fetch(`${DB_API_URL}/api/bookings`);
        const bookings = await bookingsRes.json();
        const booking = bookings.find(b => b.id == id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const emailSent = await sendInvoiceEmail(booking, 'resort');
        res.json({ success: emailSent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await fetch(`${DB_API_URL}/api/bookings/${req.params.id}`, { method: 'DELETE' });
        try { await redisPubSub.publish('booking-events', { type: 'booking.deleted', bookingId: req.params.id }); } catch (e) {}
        res.json({ message: 'Booking deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

// ─── EVENT BOOKINGS ───────────────────────────────────────────────────────────

app.get('/api/event-bookings', async (req, res) => {
    try {
        const response = await fetch(`${DB_API_URL}/api/event-bookings`);
        const bookings = await response.json();
        res.json(bookings);
    } catch (error) {
        console.error('Event bookings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch event bookings' });
    }
});

// Confirm event booking
app.post('/api/event-bookings/:id/confirm', async (req, res) => {
    try {
        const id = req.params.id;

        const bookingsRes = await fetch(`${DB_API_URL}/api/event-bookings`);
        const bookings = await bookingsRes.json();
        const booking = bookings.find(b => b.id == id);
        if (!booking) return res.status(404).json({ error: 'Event booking not found' });

        await fetch(`${DB_API_URL}/api/event-bookings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' })
        });

        // Send confirmation email
        let emailSent = false;
        try {
            const transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: booking.email,
                subject: 'Event Booking Confirmed - Vizag Resorts',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #28a745;">🎉 Event Booking Confirmed!</h2>
                        <p>Dear ${booking.guest_name},</p>
                        <p>We are delighted to confirm your event booking!</p>
                        <p><strong>Booking ID:</strong> ${booking.booking_reference}</p>
                        <p><strong>Event:</strong> ${booking.event_name}</p>
                        <p><strong>Event Date:</strong> ${new Date(booking.event_date).toLocaleDateString()}</p>
                        <p><strong>Guests:</strong> ${booking.guests}</p>
                        <p><strong>Amount Paid:</strong> ₹${parseInt(booking.total_price).toLocaleString()}</p>
                        <p><strong>Transaction ID:</strong> ${booking.transaction_id || 'N/A'}</p>
                        <p>We look forward to making your event memorable!</p>
                        <p>For any queries, contact us at vizagresortbooking@gmail.com</p>
                        <p>Warm regards,<br>Vizag Resort Booking Team</p>
                    </div>
                `
            });
            emailSent = true;
        } catch (e) { console.error('Event confirm email failed:', e.message); }

        const whatsappMsg = `✅ Event Booking Confirmed!\n\nBooking ID: ${booking.booking_reference}\nGuest: ${booking.guest_name}\nEvent: ${booking.event_name}\nDate: ${new Date(booking.event_date).toLocaleDateString()}\nGuests: ${booking.guests}\nAmount: ₹${parseInt(booking.total_price).toLocaleString()}\n\nYour event booking is confirmed. We look forward to making it memorable!`;
        const whatsappUrl = `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

        try { await redisPubSub.publish('event-events', { type: 'event.booking.confirmed', bookingId: id }); } catch (e) {}

        res.json({ success: true, emailSent, whatsappUrl });
    } catch (error) {
        console.error('Confirm event booking error:', error);
        res.status(500).json({ error: 'Failed to confirm event booking' });
    }
});

// Cancel event booking
app.post('/api/event-bookings/:id/cancel', async (req, res) => {
    try {
        const id = req.params.id;

        const bookingsRes = await fetch(`${DB_API_URL}/api/event-bookings`);
        const bookings = await bookingsRes.json();
        const booking = bookings.find(b => b.id == id);
        if (!booking) return res.status(404).json({ error: 'Event booking not found' });

        await fetch(`${DB_API_URL}/api/event-bookings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });

        let emailSent = false;
        try {
            const transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: booking.email,
                subject: 'Event Booking Cancellation - Vizag Resorts',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #dc3545;">Event Booking Cancelled</h2>
                        <p>Dear ${booking.guest_name},</p>
                        <p>Your event booking has been cancelled.</p>
                        <p><strong>Booking ID:</strong> ${booking.booking_reference}</p>
                        <p><strong>Event:</strong> ${booking.event_name}</p>
                        <p><strong>Event Date:</strong> ${new Date(booking.event_date).toLocaleDateString()}</p>
                        <p><strong>Amount:</strong> ₹${parseInt(booking.total_price).toLocaleString()}</p>
                        <p>Refund (if applicable) will be processed within 3-5 business days.</p>
                        <p>For any queries, contact us at vizagresortbooking@gmail.com</p>
                        <p>Warm regards,<br>Vizag Resort Booking Team</p>
                    </div>
                `
            });
            emailSent = true;
        } catch (e) { console.error('Event cancel email failed:', e.message); }

        const whatsappMsg = `❌ Event Booking Cancelled\n\nBooking ID: ${booking.booking_reference}\nGuest: ${booking.guest_name}\nEvent: ${booking.event_name}\nDate: ${new Date(booking.event_date).toLocaleDateString()}\nAmount: ₹${parseInt(booking.total_price).toLocaleString()}\n\nYour booking has been cancelled. Refund (if applicable) will be processed in 3-5 business days.`;
        const whatsappUrl = `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

        try { await redisPubSub.publish('event-events', { type: 'event.booking.cancelled', bookingId: id }); } catch (e) {}

        res.json({ success: true, emailSent, whatsappUrl });
    } catch (error) {
        console.error('Cancel event booking error:', error);
        res.status(500).json({ error: 'Failed to cancel event booking' });
    }
});

// Delete event booking
app.delete('/api/event-bookings/:id', async (req, res) => {
    try {
        await fetch(`${DB_API_URL}/api/event-bookings/${req.params.id}`, { method: 'DELETE' });
        try { await redisPubSub.publish('booking-events', { type: 'event.booking.deleted', bookingId: req.params.id }); } catch (e) {}
        res.json({ message: 'Event booking deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event booking' });
    }
});

// ─── OTHER ENDPOINTS ──────────────────────────────────────────────────────────

app.post('/api/check-availability', async (req, res) => res.json({ available: true }));

app.get('/api/blocked-dates/:resortId', async (req, res) => {
    try {
        const r = await fetch(`${DB_API_URL}/api/blocked-dates/${req.params.resortId}`);
        res.json(await r.json());
    } catch (e) { res.json([]); }
});

app.get('/api/coupons', async (req, res) => {
    try {
        const r = await fetch(`${DB_API_URL}/api/coupons?${new URLSearchParams(req.query)}`);
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: 'Failed to fetch coupons' }); }
});

app.get('/api/resorts', async (req, res) => {
    try {
        const r = await fetch(`${DB_API_URL}/api/resorts`);
        res.json(await r.json());
    } catch (e) { res.status(500).json({ error: 'Failed to fetch resorts' }); }
});

async function startServer() {
    try {
        await redisPubSub.connect();
        console.log('✅ Redis pub/sub connected successfully');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`📋 Booking Management running on http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start booking service:', error);
    }
}

startServer();
