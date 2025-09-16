const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

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
    
    // Create sync_events table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sync_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER,
            data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
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

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        // Log booking deleted event
        await db.run(
            'INSERT INTO sync_events (event_type, table_name, record_id, data) VALUES (?, ?, ?, ?)',
            ['booking_deleted', 'bookings', id, JSON.stringify({ id })]
        );
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`📋 Booking Management running on http://0.0.0.0:${PORT}`);
    });
});