const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { backupDatabase, generateInvoice, scheduleBackups } = require('./backup-service');

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
        
        // Generate invoice and backup database when marked as paid
        if (payment_status === 'paid') {
            try {
                const invoice = await generateInvoice(booking);
                await backupDatabase();
                console.log(`📄 Invoice generated for booking ${id}`);
            } catch (backupError) {
                console.error('Backup/Invoice error:', backupError);
            }
        }
        
        res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.run('DELETE FROM bookings WHERE id = ?', [id]);
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