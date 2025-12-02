const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const redisPubSub = require('./redis-pubsub');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

let db;

// Initialize database
async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Connect to Redis for real-time events
    await redisPubSub.connect();
    console.log('✅ Database API connected to Redis');
}

// Publish real-time events to correct channels
function publishEvent(type, data) {
    let channel = 'resort-events'; // default
    
    if (type.startsWith('resort.')) {
        channel = 'resort-events';
    } else if (type.startsWith('booking.')) {
        channel = 'booking-events';
    } else if (type.startsWith('food.')) {
        channel = 'food-events';
    } else if (type.startsWith('travel.')) {
        channel = 'travel-events';
    }
    
    redisPubSub.publish(channel, { type, data, timestamp: Date.now() });
    console.log(`📡 Published ${type} to ${channel}`);
}

// RESORTS API
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all(`
            SELECT r.*, 
                   GROUP_CONCAT(dp.day_type || ':' || dp.price) as dynamic_pricing_raw
            FROM resorts r
            LEFT JOIN dynamic_pricing dp ON r.id = dp.resort_id
            GROUP BY r.id
            ORDER BY r.sort_order ASC, r.id ASC
        `);
        
        const resortsWithPricing = resorts.map(resort => ({
            ...resort,
            dynamic_pricing: resort.dynamic_pricing_raw ? 
                resort.dynamic_pricing_raw.split(',').map(item => {
                    const [day_type, price] = item.split(':');
                    return { day_type, price: parseInt(price) };
                }) : []
        }));
        
        res.json(resortsWithPricing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const result = await db.run(`
            INSERT INTO resorts (name, location, price, description, image, gallery, videos, map_link, amenities)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.name, req.body.location, req.body.price, req.body.description, 
            req.body.image, req.body.gallery, req.body.videos, req.body.map_link, req.body.amenities]);
        
        publishEvent('resort.added', { resortId: result.lastID, ...req.body });
        res.json({ id: result.lastID, message: 'Resort created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create resort' });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        await db.run(`
            UPDATE resorts SET name=?, location=?, price=?, description=?, image=?, gallery=?, videos=?, map_link=?, amenities=?
            WHERE id=?
        `, [req.body.name, req.body.location, req.body.price, req.body.description,
            req.body.image, req.body.gallery, req.body.videos, req.body.map_link, req.body.amenities, req.params.id]);
        
        publishEvent('resort.updated', { resortId: req.params.id, ...req.body });
        res.json({ message: 'Resort updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM resorts WHERE id = ?', [req.params.id]);
        publishEvent('resort.deleted', { resortId: req.params.id });
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

// BOOKINGS API
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            LEFT JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC
        `);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, 
                                total_price, transaction_id, booking_reference, coupon_code, discount_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.resortId, req.body.guestName, req.body.email, req.body.phone,
            req.body.checkIn, req.body.checkOut, req.body.guests, req.body.totalPrice,
            req.body.transactionId, req.body.bookingReference, req.body.couponCode, req.body.discountAmount]);
        
        publishEvent('booking.added', { bookingId: result.lastID, ...req.body });
        res.json({ id: result.lastID, message: 'Booking created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    try {
        await db.run('UPDATE bookings SET payment_status = ? WHERE id = ?', 
                    [req.body.payment_status, req.params.id]);
        
        publishEvent('booking.updated', { bookingId: req.params.id, ...req.body });
        res.json({ message: 'Booking updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// COUPONS API
app.get('/api/coupons', async (req, res) => {
    try {
        let query = 'SELECT * FROM coupons WHERE 1=1';
        const params = [];
        
        if (req.query.resortId) {
            query += ' AND (resort_id IS NULL OR resort_id = ?)';
            params.push(req.query.resortId);
        }
        
        const coupons = await db.all(query, params);
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

app.post('/api/coupons', async (req, res) => {
    try {
        await db.run(`
            INSERT INTO coupons (code, type, discount, day_type, resort_id)
            VALUES (?, ?, ?, ?, ?)
        `, [req.body.code, req.body.type, req.body.discount, req.body.day_type, req.body.resort_id]);
        
        publishEvent('coupon.added', req.body);
        res.json({ message: 'Coupon created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

// FOOD ORDERS API
app.get('/api/food-orders', async (req, res) => {
    try {
        const orders = await db.all('SELECT * FROM food_orders ORDER BY order_time DESC');
        res.json(orders || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch food orders' });
    }
});

app.post('/api/food-orders', async (req, res) => {
    try {
        const result = await db.run(`
            INSERT INTO food_orders (order_id, booking_id, guest_name, resort_name, phone_number,
                                   items, subtotal, delivery_fee, total, delivery_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.orderId, req.body.bookingId, req.body.guestName, req.body.resortName,
            req.body.phoneNumber, JSON.stringify(req.body.items), req.body.subtotal,
            req.body.deliveryFee, req.body.total, req.body.deliveryTime, 'pending_verification']);
        
        publishEvent('food.order.added', { orderId: req.body.orderId, ...req.body });
        res.json({ id: result.lastID, message: 'Food order created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create food order' });
    }
});

// TRAVEL BOOKINGS API
app.get('/api/travel-bookings', async (req, res) => {
    try {
        const bookings = await db.all('SELECT * FROM travel_bookings ORDER BY created_at DESC');
        res.json(bookings || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch travel bookings' });
    }
});

app.post('/api/travel-bookings', async (req, res) => {
    try {
        const result = await db.run(`
            INSERT INTO travel_bookings (booking_reference, customer_name, phone, email,
                                       travel_date, pickup_location, packages, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.booking_reference, req.body.customer_name, req.body.phone, req.body.email,
            req.body.travel_date, req.body.pickup_location, JSON.stringify(req.body.packages),
            req.body.total_amount, 'pending_verification']);
        
        publishEvent('travel.booking.added', { bookingId: result.lastID, ...req.body });
        res.json({ id: result.lastID, message: 'Travel booking created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create travel booking' });
    }
});

// REAL-TIME EVENTS ENDPOINT
app.get('/api/events', (req, res) => {
    const clientId = `db-client-${Date.now()}-${Math.random()}`;
    redisPubSub.subscribe(clientId, res);
    console.log('📡 Database API client connected to real-time events');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Centralized Database API', port: PORT });
});

// Start server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🗄️ Centralized Database API running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
});