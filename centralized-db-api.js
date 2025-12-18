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
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER,
            guest_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            guests INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            base_price INTEGER,
            platform_fee INTEGER,
            transaction_fee INTEGER DEFAULT 0,
            booking_reference TEXT,
            transaction_id TEXT,
            coupon_code TEXT,
            discount_amount INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending_payment',
            payment_status TEXT DEFAULT 'pending',
            email_verified INTEGER DEFAULT 0,
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
    
    console.log('✅ Database tables initialized');
    
    // Add missing columns to existing bookings table
    try {
        await db.exec('ALTER TABLE bookings ADD COLUMN coupon_code TEXT');
        console.log('✅ Added coupon_code column');
    } catch (error) {
        // Column already exists
    }
    
    try {
        await db.exec('ALTER TABLE bookings ADD COLUMN discount_amount INTEGER DEFAULT 0');
        console.log('✅ Added discount_amount column');
    } catch (error) {
        // Column already exists
    }
    
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
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, 
                                total_price, transaction_id, booking_reference)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.body.resortId, req.body.guestName, req.body.email, req.body.phone,
            req.body.checkIn, req.body.checkOut, req.body.guests, req.body.totalPrice,
            req.body.transactionId || null, req.body.bookingReference]);
        
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
        await db.run('UPDATE bookings SET payment_status = ? WHERE id = ?', 
                    [req.body.payment_status, req.params.id]);
        
        publishEvent('booking.updated', { bookingId: req.params.id, ...req.body });
        res.json({ message: 'Booking updated successfully' });
    } catch (error) {
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