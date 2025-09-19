const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { backupDatabase, generateInvoice, scheduleBackups } = require('./backup-service');
const { publishEvent, EVENTS } = require('./eventbridge-service');
const { sendInvoiceEmail } = require('./email-service');
const { sendTelegramNotification, formatBookingNotification } = require('./telegram-service');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('bookings-public'));

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
        
        // Generate invoice and backup database when marked as paid
        if (payment_status === 'paid') {
            console.log(`💰 Payment marked as paid for booking ${id}, processing...`);
            try {
                console.log('📄 Generating invoice...');
                const invoice = await generateInvoice(booking);
                console.log('💾 Creating backup...');
                await backupDatabase();
                console.log(`✅ Invoice generated and backup created for booking ${id}`);
            } catch (error) {
                console.error('❌ Invoice/Backup error:', error);
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

app.post('/api/test-backup', async (req, res) => {
    try {
        console.log('🧪 Manual backup test triggered');
        const result = await backupDatabase();
        res.json({ message: 'Backup completed successfully', location: result });
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
        
        // Get booking details before deletion
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [bookingId]);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Delete the booking
        await db.run('DELETE FROM bookings WHERE id = ?', [bookingId]);
        await db.run('DELETE FROM payment_proofs WHERE booking_id = ?', [bookingId]);
        
        // Send cancellation email if requested
        if (sendEmail) {
            try {
                const { sendEmail: emailService } = require('./email-service');
                const subject = 'Booking Cancellation - Vizag Resorts';
                const message = `
                    <h2>Booking Cancelled</h2>
                    <p>Dear ${booking.guest_name},</p>
                    <p>Your booking has been cancelled:</p>
                    <ul>
                        <li><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</li>
                        <li><strong>Resort:</strong> ${booking.resort_name}</li>
                        <li><strong>Dates:</strong> ${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</li>
                    </ul>
                    <p>If you have any questions, please contact us.</p>
                    <p>Thank you,<br>Vizag Resorts Team</p>
                `;
                
                await emailService(booking.email, subject, message);
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

// Endpoint to get payment proof details for invoice generation
app.get('/api/payment-proof/:bookingId', async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const proof = await db.get(
            'SELECT transaction_id, card_last_four FROM payment_proofs WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
            [bookingId]
        );
        
        if (proof) {
            res.json(proof);
        } else {
            res.json({ transaction_id: null, card_last_four: null });
        }
    } catch (error) {
        console.error('Payment proof fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch payment proof' });
    }
});

// EventBridge Server-Sent Events endpoint
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);
    
    req.on('close', () => {
        clearInterval(keepAlive);
    });
});



initDB().then(() => {
    // Start automatic backups
    scheduleBackups();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`📋 Booking Management running on http://0.0.0.0:${PORT}`);
    });
});