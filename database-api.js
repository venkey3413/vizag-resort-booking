const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const PORT = process.env.DB_API_PORT || 3003;

app.use(cors());
app.use(express.json());

let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Create all tables
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
            booking_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS food_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            category TEXT,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS travel_packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            duration TEXT,
            image TEXT,
            gallery TEXT,
            sites TEXT,
            car_pricing TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        CREATE TABLE IF NOT EXISTS resort_owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password TEXT NOT NULL,
            resort_ids TEXT NOT NULL,
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
        CREATE TABLE IF NOT EXISTS payment_proofs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            transaction_id TEXT NOT NULL,
            screenshot_data TEXT,
            card_last_four TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings (id)
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
    
    console.log('✅ Database tables initialized');
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Database API', port: PORT });
});

// Generic query endpoint
app.post('/api/query', async (req, res) => {
    try {
        const { sql, params = [] } = req.body;
        const result = await db.all(sql, params);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generic execute endpoint (INSERT, UPDATE, DELETE)
app.post('/api/execute', async (req, res) => {
    try {
        const { sql, params = [] } = req.body;
        const result = await db.run(sql, params);
        res.json({ 
            success: true, 
            lastID: result.lastID, 
            changes: result.changes 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Resorts endpoints
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all('SELECT * FROM resorts ORDER BY sort_order ASC, id ASC');
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order } = req.body;
        const result = await db.run(`
            INSERT INTO resorts (name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order || 0]);
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const { name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order, available } = req.body;
        await db.run(`
            UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, 
            image = ?, gallery = ?, videos = ?, map_link = ?, amenities = ?, note = ?, 
            max_guests = ?, sort_order = ?, available = ?
            WHERE id = ?
        `, [name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order, available, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM resorts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bookings endpoints
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
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { resort_id, guest_name, email, phone, check_in, check_out, guests, total_price, booking_reference, payment_status } = req.body;
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, total_price, booking_reference, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [resort_id, guest_name, email, phone, check_in, check_out, guests, total_price, booking_reference, payment_status || 'pending']);
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    try {
        const { payment_status, status } = req.body;
        await db.run('UPDATE bookings SET payment_status = ?, status = ? WHERE id = ?', 
            [payment_status, status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Food items endpoints
app.get('/api/food-items', async (req, res) => {
    try {
        const items = await db.all('SELECT * FROM food_items ORDER BY id');
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/food-items', async (req, res) => {
    try {
        const { name, description, price, category, image } = req.body;
        const result = await db.run(
            'INSERT INTO food_items (name, description, price, category, image) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, category, image]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/food-items/:id', async (req, res) => {
    try {
        const { name, description, price, category, image } = req.body;
        await db.run(
            'UPDATE food_items SET name = ?, description = ?, price = ?, category = ?, image = ? WHERE id = ?',
            [name, description, price, category, image, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/food-items/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM food_items WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Travel packages endpoints
app.get('/api/travel-packages', async (req, res) => {
    try {
        const packages = await db.all('SELECT * FROM travel_packages ORDER BY id');
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/travel-packages', async (req, res) => {
    try {
        const { name, description, price, duration, image, gallery, sites, car_pricing } = req.body;
        const result = await db.run(
            'INSERT INTO travel_packages (name, description, price, duration, image, gallery, sites, car_pricing) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, duration, image, gallery, sites, JSON.stringify(car_pricing)]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/travel-packages/:id', async (req, res) => {
    try {
        const { name, description, price, duration, image, gallery, sites, car_pricing } = req.body;
        await db.run(
            'UPDATE travel_packages SET name = ?, description = ?, price = ?, duration = ?, image = ?, gallery = ?, sites = ?, car_pricing = ? WHERE id = ?',
            [name, description, price, duration, image, gallery, sites, JSON.stringify(car_pricing), req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/travel-packages/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM travel_packages WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Coupons endpoints
app.get('/api/coupons', async (req, res) => {
    try {
        const coupons = await db.all('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/coupons', async (req, res) => {
    try {
        const { code, type, discount, day_type, resort_id } = req.body;
        await db.run('INSERT INTO coupons (code, type, discount, day_type, resort_id) VALUES (?, ?, ?, ?, ?)', 
            [code, type, discount, day_type || 'all', resort_id || null]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/coupons/:code', async (req, res) => {
    try {
        await db.run('DELETE FROM coupons WHERE code = ?', [req.params.code]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Owners endpoints
app.get('/api/owners', async (req, res) => {
    try {
        const owners = await db.all('SELECT * FROM resort_owners ORDER BY created_at DESC');
        res.json(owners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/owners', async (req, res) => {
    try {
        const { name, email, phone, password, resort_ids } = req.body;
        const result = await db.run(
            'INSERT INTO resort_owners (name, email, phone, password, resort_ids) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, password, resort_ids]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/owners/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM resort_owners WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🗄️ Database API running on http://0.0.0.0:${PORT}`);
    });
});