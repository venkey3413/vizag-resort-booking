require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { db, initDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('admin-public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/admin-public/index.html');
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Admin server working' });
});

initDatabase();

const { db: getDb } = require('./database');
let lastEventId = 0;
async function pollSyncEvents() {
    try {
        const rows = await getDb().all('SELECT * FROM sync_events WHERE id > ? ORDER BY id ASC', [lastEventId]);
        for (const event of rows) {
            lastEventId = event.id;
            const payload = JSON.parse(event.payload);
            switch (event.event_type) {
                case 'booking_created':
                    io.emit('bookingCreated', payload);
                    break;
                case 'booking_deleted':
                    io.emit('bookingDeleted', payload);
                    break;
                case 'resort_added':
                    io.emit('resortAdded', payload);
                    break;
                case 'resort_updated':
                    io.emit('resortUpdated', payload);
                    break;
            }
        }
    } catch (err) {
        console.error('Error polling sync_events:', err);
    }
}
setInterval(pollSyncEvents, 2000);

app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        if (!db()) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        
        const totalResorts = await db().get('SELECT COUNT(*) as count FROM resorts');
        const totalBookings = await db().get('SELECT COUNT(*) as count FROM bookings');
        const totalRevenue = await db().get('SELECT SUM(total_price) as revenue FROM bookings WHERE payment_status = "completed"');
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = await db().get('SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = ?', [today]);
        
        const locationStats = await db().all(`
            SELECT r.location, COUNT(b.id) as count 
            FROM resorts r 
            LEFT JOIN bookings b ON r.id = b.resort_id 
            GROUP BY r.location 
            ORDER BY count DESC 
            LIMIT 5
        `);
        
        const recentBookings = await db().all(`
            SELECT b.guest_name, b.total_price, r.name as resort_name, b.booking_date
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC 
            LIMIT 5
        `);
        
        const monthlyRevenue = await db().all(`
            SELECT 
                strftime('%Y-%m', booking_date) as month,
                SUM(total_price) as revenue
            FROM bookings 
            WHERE payment_status = 'completed'
            AND booking_date >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', booking_date)
            ORDER BY month
        `);
        
        res.json({
            totalResorts: totalResorts.count,
            totalBookings: totalBookings.count,
            totalRevenue: totalRevenue.revenue || 0,
            todayBookings: todayBookings.count,
            locationStats,
            recentBookings,
            monthlyRevenue
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

app.get('/api/resorts', async (req, res) => {
    try {
        const rows = await db().all('SELECT * FROM resorts ORDER BY id DESC');
        const resorts = rows.map(row => {
            let amenities = [];
            let images = [];
            let videos = [];
            try {
                amenities = JSON.parse(row.amenities || '[]');
                images = JSON.parse(row.images || '[]');
                videos = JSON.parse(row.videos || '[]');
            } catch (e) {
                amenities = [];
                images = [];
                videos = [];
            }
            return {
                ...row,
                amenities,
                images,
                videos
            };
        });
        res.json(resorts);
    } catch (error) {
        console.error('Error fetching resorts:', error);
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, peakPrice, offPeakPrice, peakStart, peakEnd, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        if (!name || !location || !price) {
            return res.status(400).json({ error: 'Name, location, and price are required' });
        }
        
        const result = await db().run(
            'INSERT INTO resorts (name, location, price, peak_price, off_peak_price, peak_season_start, peak_season_end, description, images, videos, amenities, available, max_guests, per_head_charge, map_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, location, parseInt(price), peakPrice ? parseInt(peakPrice) : null, offPeakPrice ? parseInt(offPeakPrice) : null, peakStart || null, peakEnd || null, description || 'No description', JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), 1, parseInt(maxGuests) || 10, parseInt(perHeadCharge) || 300, req.body.mapLink || '']
        );
        
        const newResort = { 
            id: result.lastID, 
            name, 
            location, 
            price: parseInt(price), 
            description, 
            images, 
            videos, 
            amenities,
            available: true,
            max_guests: parseInt(maxGuests) || 10,
            per_head_charge: parseInt(perHeadCharge) || 300
        };
        
        io.emit('resortAdded', newResort);
        res.json({ id: result.lastID, message: 'Resort added successfully' });
    } catch (error) {
        console.error('Error adding resort:', error);
        res.status(500).json({ error: 'Failed to add resort: ' + error.message });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, location, price, peakPrice, offPeakPrice, peakStart, peakEnd, description, images, videos, amenities, maxGuests, perHeadCharge } = req.body;
        
        await db().run(
            'UPDATE resorts SET name = ?, location = ?, price = ?, peak_price = ?, off_peak_price = ?, peak_season_start = ?, peak_season_end = ?, description = ?, images = ?, videos = ?, amenities = ?, max_guests = ?, per_head_charge = ?, map_link = ? WHERE id = ?',
            [name, location, parseInt(price), peakPrice ? parseInt(peakPrice) : null, offPeakPrice ? parseInt(offPeakPrice) : null, peakStart || null, peakEnd || null, description, JSON.stringify(images || []), JSON.stringify(videos || []), JSON.stringify(amenities || []), parseInt(maxGuests) || 10, parseInt(perHeadCharge) || 300, req.body.mapLink || '', id]
        );
        
        const updatedResort = { id, name, location, price: parseInt(price), description, images, videos, amenities };
        io.emit('resortUpdated', updatedResort);
        res.json({ message: 'Resort updated successfully' });
    } catch (error) {
        console.error('Error updating resort:', error);
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db().run('DELETE FROM resorts WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        io.emit('resortDeleted', { id });
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        console.error('Error deleting resort:', error);
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

app.get('/api/discount-codes', async (req, res) => {
    try {
        const codes = await db().all('SELECT * FROM discount_codes ORDER BY created_at DESC');
        res.json(codes);
    } catch (error) {
        console.error('Error fetching discount codes:', error);
        res.status(500).json({ error: 'Failed to fetch discount codes' });
    }
});

app.post('/api/discount-codes', async (req, res) => {
    try {
        const { code, discountType, discountValue, minAmount, maxUses, validUntil } = req.body;
        
        const result = await db().run(
            'INSERT INTO discount_codes (code, discount_type, discount_value, min_amount, max_uses, valid_until) VALUES (?, ?, ?, ?, ?, ?)',
            [code, discountType, discountValue, minAmount || 0, maxUses || null, validUntil || null]
        );
        
        res.json({ id: result.lastID, message: 'Discount code created successfully' });
    } catch (error) {
        console.error('Error creating discount code:', error);
        res.status(500).json({ error: 'Failed to create discount code' });
    }
});

app.get('/api/calendar/bookings', async (req, res) => {
    try {
        const bookings = await db().all(`
            SELECT 
                b.id,
                b.guest_name,
                b.check_in,
                b.check_out,
                b.guests,
                b.payment_status,
                r.name as resort_name,
                r.location
            FROM bookings b
            JOIN resorts r ON b.resort_id = r.id
            WHERE b.check_in >= date('now', '-30 days')
            AND b.check_in <= date('now', '+90 days')
            ORDER BY b.check_in
        `);
        
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching calendar bookings:', error);
        res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
});

app.get('/api/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { format } = req.query;
        
        let data = [];
        let filename = '';
        
        if (type === 'bookings') {
            data = await db().all(`
                SELECT 
                    b.id,
                    b.guest_name,
                    b.email,
                    b.phone,
                    r.name as resort_name,
                    r.location,
                    b.check_in,
                    b.check_out,
                    b.guests,
                    b.total_price,
                    b.payment_status,
                    b.booking_date
                FROM bookings b
                JOIN resorts r ON b.resort_id = r.id
                ORDER BY b.booking_date DESC
            `);
            filename = 'bookings';
        } else if (type === 'resorts') {
            data = await db().all(`
                SELECT 
                    id,
                    name,
                    location,
                    price,
                    peak_price,
                    off_peak_price,
                    max_guests,
                    per_head_charge,
                    available,
                    created_at
                FROM resorts
                ORDER BY created_at DESC
            `);
            filename = 'resorts';
        } else {
            return res.status(400).json({ error: 'Invalid export type' });
        }
        
        if (format === 'csv') {
            if (data.length === 0) {
                return res.status(404).json({ error: 'No data to export' });
            }
            
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => 
                Object.values(row).map(value => 
                    typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value
                ).join(',')
            );
            
            const csv = [headers, ...rows].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
            res.send(csv);
        } else {
            res.status(400).json({ error: 'Invalid format. Use csv' });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

io.on('connection', (socket) => {
    console.log('Admin client connected:', socket.id);
    socket.emit('dashboardUpdate', 'connected');
    
    socket.on('disconnect', () => {
        console.log('Admin client disconnected:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🔧 Admin Panel running on http://0.0.0.0:${PORT}`);
});