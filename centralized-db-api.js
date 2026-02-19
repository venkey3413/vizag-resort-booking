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
    
    // Create all necessary tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resorts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            image TEXT,
            gallery TEXT,
            videos TEXT,
            map_link TEXT,
            amenities TEXT,
            note TEXT,
            max_guests INTEGER,
            sort_order INTEGER DEFAULT 0,
            available INTEGER DEFAULT 1
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            price INTEGER NOT NULL,
            event_type TEXT,
            description TEXT,
            image TEXT,
            gallery TEXT,
            videos TEXT,
            map_link TEXT,
            amenities TEXT,
            note TEXT,
            max_guests INTEGER,
            sort_order INTEGER DEFAULT 0,
            available INTEGER DEFAULT 1
        )
    `);
    
    // Drop and recreate bookings table with correct schema
    await db.exec('DROP TABLE IF EXISTS bookings');
    await db.exec(`
        CREATE TABLE bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER,
            guest_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            guests INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            booking_reference TEXT,
            transaction_id TEXT,
            coupon_code TEXT,
            discount_amount INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending_payment',
            payment_status TEXT DEFAULT 'pending',
            booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (resort_id) REFERENCES resorts (id)
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            discount INTEGER NOT NULL,
            day_type TEXT DEFAULT 'all',
            resort_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS dynamic_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER NOT NULL,
            day_type TEXT NOT NULL,
            price INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (resort_id) REFERENCES resorts (id)
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS food_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            booking_id TEXT NOT NULL,
            resort_name TEXT NOT NULL,
            guest_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            delivery_time TEXT,
            items TEXT NOT NULL,
            subtotal INTEGER NOT NULL,
            delivery_fee INTEGER NOT NULL,
            total INTEGER NOT NULL,
            status TEXT DEFAULT 'pending_payment',
            payment_method TEXT,
            transaction_id TEXT,
            payment_id TEXT,
            order_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            confirmed_at DATETIME,
            cancelled_at DATETIME
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS travel_bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_reference TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            travel_date TEXT NOT NULL,
            pickup_location TEXT NOT NULL,
            car_type TEXT NOT NULL,
            packages TEXT NOT NULL,
            base_amount INTEGER,
            car_multiplier REAL,
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'pending_payment',
            payment_method TEXT,
            transaction_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resort_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER NOT NULL,
            block_date DATE NOT NULL,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (resort_id) REFERENCES resorts (id)
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
            session_id TEXT PRIMARY KEY,
            status TEXT DEFAULT 'pending',
            agent_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            message TEXT NOT NULL,
            sender_type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
        )
    `);
    
    console.log('✅ Database tables initialized');
    
    // Add sample resort if none exist (for EC2 deployment)
    const existingResorts = await db.all('SELECT COUNT(*) as count FROM resorts');
    if (existingResorts[0].count === 0) {
        console.log('🏨 Adding sample resort for EC2 deployment...');
        await db.run(`
            INSERT INTO resorts (name, location, price, description, image, available)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['Sample Resort', 'Vizag Beach', 2500, 'Beautiful beachfront resort', '/images/sample.jpg', 1]);
        console.log('✅ Sample resort added');
    }
    
    // Connect to Redis for real-time events
    await redisPubSub.connect();
    console.log('✅ Database API connected to Redis');
}

// Publish real-time events to correct channels
function publishEvent(type, data) {
    let channel = 'resort-events'; // default
    
    if (type.startsWith('resort.')) {
        channel = 'resort-events';
    } else if (type.startsWith('event.')) {
        channel = 'event-events';
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
app.get('/api/resorts/:id', async (req, res) => {
    try {
        const resort = await db.get(`
            SELECT r.*, 
                   GROUP_CONCAT(dp.day_type || ':' || dp.price) as dynamic_pricing_raw
            FROM resorts r
            LEFT JOIN dynamic_pricing dp ON r.id = dp.resort_id
            WHERE r.id = ?
            GROUP BY r.id
        `, [req.params.id]);
        
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        const resortWithPricing = {
            ...resort,
            dynamic_pricing: resort.dynamic_pricing_raw ? 
                resort.dynamic_pricing_raw.split(',').map(item => {
                    const [day_type, price] = item.split(':');
                    return { day_type, price: parseInt(price) };
                }) : []
        };
        
        res.json(resortWithPricing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resort' });
    }
});

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

// EVENTS API
app.get('/api/events', async (req, res) => {
    try {
        const events = await db.all('SELECT * FROM events ORDER BY sort_order ASC, id ASC');
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

app.post('/api/events', async (req, res) => {
    try {
        const result = await db.run(`
            INSERT INTO events (name, location, price, event_type, description, image, gallery, videos, map_link, amenities, note, max_guests)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.name, req.body.location, req.body.price, req.body.event_type, req.body.description, 
            req.body.image, req.body.gallery, req.body.videos, req.body.map_link, req.body.amenities, req.body.note, req.body.max_guests]);
        
        publishEvent('event.created', { eventId: result.lastID, ...req.body });
        res.json({ id: result.lastID, message: 'Event created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.put('/api/events/:id', async (req, res) => {
    try {
        await db.run(`
            UPDATE events SET name=?, location=?, price=?, event_type=?, description=?, image=?, gallery=?, videos=?, map_link=?, amenities=?, note=?, max_guests=?
            WHERE id=?
        `, [req.body.name, req.body.location, req.body.price, req.body.event_type, req.body.description,
            req.body.image, req.body.gallery, req.body.videos, req.body.map_link, req.body.amenities, req.body.note, req.body.max_guests, req.params.id]);
        
        publishEvent('event.updated', { eventId: req.params.id, ...req.body });
        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM events WHERE id = ?', [req.params.id]);
        publishEvent('event.deleted', { eventId: req.params.id });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

app.post('/api/events/reorder', async (req, res) => {
    try {
        const { eventOrders } = req.body;
        
        for (const order of eventOrders) {
            await db.run('UPDATE events SET sort_order = ? WHERE id = ?', [order.sort_order, order.id]);
        }
        
        publishEvent('event.reordered', { eventOrders });
        res.json({ message: 'Events reordered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reorder events' });
    }
});

// BOOKINGS API
app.get('/api/bookings', async (req, res) => {
    try {
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        const bookings = await db.all(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            LEFT JOIN resorts r ON b.resort_id = r.id 
            ORDER BY b.booking_date DESC
        `);
        console.log('📊 EC2 Bookings fetch:', bookings.length, 'bookings found');
        if (bookings.length > 0) {
            console.log('📋 Latest booking:', bookings[0]);
        }
        res.json(bookings);
    } catch (error) {
        console.error('❌ EC2 Bookings fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        console.log('📝 EC2 Booking creation request:', {
            resortId: req.body.resortId,
            guestName: req.body.guestName,
            email: req.body.email,
            bookingReference: req.body.bookingReference
        });
        
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, total_price, booking_reference, transaction_id, coupon_code, discount_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.resortId, req.body.guestName, req.body.email, req.body.phone,
            req.body.checkIn, req.body.checkOut, req.body.guests, req.body.totalPrice,
            req.body.bookingReference, req.body.transactionId || null, req.body.couponCode || null, req.body.discountAmount || 0]);
        
        console.log('✅ EC2 Booking created with ID:', result.lastID);
        
        publishEvent('booking.added', { bookingId: result.lastID, ...req.body });
        res.json({ id: result.lastID, message: 'Booking created successfully' });
    } catch (error) {
        console.error('❌ EC2 Booking creation failed:', error.message);
        console.error('❌ Full error:', error);
        res.status(500).json({ error: 'Failed to create booking', details: error.message });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    try {
        const updateFields = [];
        const params = [];
        
        if (req.body.payment_status) {
            updateFields.push('payment_status = ?');
            params.push(req.body.payment_status);
        }
        
        if (req.body.transaction_id) {
            updateFields.push('transaction_id = ?');
            params.push(req.body.transaction_id);
        }
        
        if (req.body.status) {
            updateFields.push('status = ?');
            params.push(req.body.status);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        params.push(req.params.id);
        
        await db.run(
            `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
        
        publishEvent('booking.updated', { bookingId: req.params.id, ...req.body });
        res.json({ message: 'Booking updated successfully' });
    } catch (error) {
        console.error('Booking update error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
        publishEvent('booking.deleted', { bookingId: req.params.id });
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
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

app.delete('/api/coupons/:code', async (req, res) => {
    try {
        await db.run('DELETE FROM coupons WHERE code = ?', [req.params.code]);
        publishEvent('coupon.deleted', { code: req.params.code });
        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete coupon' });
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

// DYNAMIC PRICING API
app.get('/api/dynamic-pricing/:resortId', async (req, res) => {
    try {
        const pricing = await db.all(
            'SELECT * FROM dynamic_pricing WHERE resort_id = ?',
            [req.params.resortId]
        );
        res.json(pricing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dynamic pricing' });
    }
});

app.post('/api/dynamic-pricing', async (req, res) => {
    try {
        const { resortId, weekdayPrice, fridayPrice, weekendPrice } = req.body;
        
        // Delete existing pricing for this resort
        await db.run('DELETE FROM dynamic_pricing WHERE resort_id = ?', [resortId]);
        
        // Insert new pricing
        const pricing = [];
        if (weekdayPrice) {
            await db.run(
                'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                [resortId, 'weekday', weekdayPrice]
            );
            pricing.push({ day_type: 'weekday', price: weekdayPrice });
        }
        if (fridayPrice) {
            await db.run(
                'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                [resortId, 'friday', fridayPrice]
            );
            pricing.push({ day_type: 'friday', price: fridayPrice });
        }
        if (weekendPrice) {
            await db.run(
                'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                [resortId, 'weekend', weekendPrice]
            );
            pricing.push({ day_type: 'weekend', price: weekendPrice });
        }
        
        publishEvent('resort.pricing.updated', { resortId, pricing });
        res.json({ message: 'Dynamic pricing updated successfully', pricing });
    } catch (error) {
        console.error('Dynamic pricing update error:', error);
        res.status(500).json({ error: 'Failed to update dynamic pricing' });
    }
});

// BLOCKED DATES API
app.get('/api/blocked-dates/:resortId', async (req, res) => {
    try {
        const blockedDates = [];
        
        // Check resort_blocks table
        try {
            const blocks = await db.all(
                'SELECT block_date FROM resort_blocks WHERE resort_id = ?',
                [req.params.resortId]
            );
            blockedDates.push(...blocks);
        } catch (error) {
            console.log('Resort blocks table not found');
        }
        
        // Check resort_availability table
        try {
            const availability = await db.all(
                'SELECT blocked_date FROM resort_availability WHERE resort_id = ?',
                [req.params.resortId]
            );
            blockedDates.push(...availability);
        } catch (error) {
            console.log('Resort availability table not found');
        }
        
        res.json(blockedDates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blocked dates' });
    }
});

// REAL-TIME EVENTS ENDPOINT
app.get('/api/events', (req, res) => {
    const clientId = `db-client-${Date.now()}-${Math.random()}`;
    redisPubSub.subscribe(clientId, res);
    console.log('📡 Database API client connected to real-time events');
});

// CHAT API
app.get('/api/chat-sessions', async (req, res) => {
    try {
        const sessions = await db.all('SELECT * FROM chat_sessions ORDER BY created_at DESC');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
});

app.get('/api/chat-sessions/:sessionId', async (req, res) => {
    try {
        const session = await db.get('SELECT * FROM chat_sessions WHERE session_id = ?', [req.params.sessionId]);
        res.json(session || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat session' });
    }
});

app.post('/api/chat-sessions', async (req, res) => {
    try {
        await db.run(`
            INSERT INTO chat_sessions (session_id, status, created_at)
            VALUES (?, ?, ?)
        `, [req.body.session_id, req.body.status, req.body.created_at]);
        
        res.json({ message: 'Chat session created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat session' });
    }
});

app.put('/api/chat-sessions/:sessionId', async (req, res) => {
    try {
        await db.run(`
            UPDATE chat_sessions SET status = ?, agent_id = ? WHERE session_id = ?
        `, [req.body.status, req.body.agent_id, req.params.sessionId]);
        
        res.json({ message: 'Chat session updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update chat session' });
    }
});

app.get('/api/chat-messages/:sessionId', async (req, res) => {
    try {
        const messages = await db.all(
            'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC',
            [req.params.sessionId]
        );
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
});

app.get('/api/chat-messages/:sessionId/latest', async (req, res) => {
    try {
        const message = await db.get(
            'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1',
            [req.params.sessionId]
        );
        res.json(message || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch latest message' });
    }
});

app.post('/api/chat-messages', async (req, res) => {
    try {
        const result = await db.run(`
            INSERT INTO chat_messages (session_id, message, sender_type, timestamp)
            VALUES (?, ?, ?, ?)
        `, [req.body.session_id, req.body.message, req.body.sender_type, req.body.timestamp]);
        
        res.json({ id: result.lastID, message: 'Chat message created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat message' });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const bookingCount = await db.get('SELECT COUNT(*) as count FROM bookings');
        const resortCount = await db.get('SELECT COUNT(*) as count FROM resorts');
        res.json({ 
            status: 'OK', 
            service: 'Centralized Database API', 
            port: PORT,
            bookings: bookingCount.count,
            resorts: resortCount.count
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            service: 'Centralized Database API', 
            error: error.message 
        });
    }
});

// Start server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🗄️ Centralized Database API running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
});