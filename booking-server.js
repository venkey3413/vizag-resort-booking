const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { backupDatabase, generateInvoice, scheduleBackups } = require('./backup-service');
const { publishEvent, EVENTS } = require('./eventbridge-service');
const { sendInvoiceEmail } = require('./email-service');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('booking-public'));

let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Add payment_status column if it doesn't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT "pending"');
    } catch (error) {
        // Column already exists, ignore error
    }
    

}

// Booking API Routes
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC
        `);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.put('/api/bookings/:id/payment', async (req, res) => {
    try {
        const id = req.params.id;
        const { payment_status } = req.body;
        
        // Get booking details for invoice
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [id]);
        
        await db.run(
            'UPDATE bookings SET payment_status = ? WHERE id = ?',
            [payment_status, id]
        );
        
        // Generate invoice, send email, and backup database when marked as paid
        if (payment_status === 'paid') {
            console.log(`💰 Payment marked as paid for booking ${id}, processing...`);
            try {
                console.log('📄 Generating invoice...');
                const invoice = await generateInvoice(booking);
                console.log('📧 Sending email...');
                await sendInvoiceEmail(booking);
                console.log('💾 Creating backup...');
                await backupDatabase();
                console.log(`✅ Invoice generated and email sent for booking ${id}`);
            } catch (error) {
                console.error('❌ Invoice/Email/Backup error:', error);
            }
        }
        
        // Publish payment updated event
        try {
            await publishEvent('resort.booking', EVENTS.PAYMENT_UPDATED, {
                bookingId: id,
                paymentStatus: payment_status,
                guestName: booking.guest_name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.post('/api/bookings/:id/send-email', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Get booking details
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [id]);
        
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
        await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        // Publish booking deleted event
        try {
            await publishEvent('resort.booking', EVENTS.BOOKING_DELETED, {
                bookingId: id
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

initDB().then(() => {
    // Start automatic backups
    scheduleBackups();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`📋 Booking Management running on http://0.0.0.0:${PORT}`);
    });
});