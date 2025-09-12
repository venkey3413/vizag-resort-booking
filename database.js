const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

// Initialize SQLite database
async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    return db;
}

// Initialize database and tables
async function initDatabase() {
    try {
        await initDB();
        await createTables();
        console.log('✅ SQLite Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
}

// Create tables
async function createTables() {
    try {
        // Resorts table with media support
        await db.exec(`
            CREATE TABLE IF NOT EXISTS resorts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                price INTEGER NOT NULL,
                description TEXT,
                images TEXT DEFAULT '[]',
                videos TEXT DEFAULT '[]',
                amenities TEXT DEFAULT '[]',
                rating REAL DEFAULT 0,
                available INTEGER DEFAULT 1,
                max_guests INTEGER DEFAULT 10,
                per_head_charge INTEGER DEFAULT 300,
                map_link TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add missing columns if they don't exist
        try {
            await db.exec(`ALTER TABLE resorts ADD COLUMN map_link TEXT`);
        } catch (err) {
            // Column already exists, ignore error
        }
        
        try {
            await db.exec(`ALTER TABLE resorts ADD COLUMN peak_price INTEGER`);
        } catch (err) {
            // Column already exists, ignore error
        }
        
        try {
            await db.exec(`ALTER TABLE resorts ADD COLUMN off_peak_price INTEGER`);
        } catch (err) {
            // Column already exists, ignore error
        }
        
        try {
            await db.exec(`ALTER TABLE resorts ADD COLUMN peak_season_start TEXT`);
        } catch (err) {
            // Column already exists, ignore error
        }
        
        try {
            await db.exec(`ALTER TABLE resorts ADD COLUMN peak_season_end TEXT`);
        } catch (err) {
            // Column already exists, ignore error
        }

        // Bookings table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resort_id INTEGER,
                resort_name TEXT,
                guest_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                guests INTEGER NOT NULL,
                total_price INTEGER NOT NULL,
                payment_id TEXT,
                order_id TEXT,
                utr_number TEXT,
                payment_status TEXT DEFAULT 'pending',
                status TEXT DEFAULT 'confirmed',
                booking_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Transaction history table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                payment_id TEXT,
                amount INTEGER NOT NULL,
                payment_method TEXT DEFAULT 'online',
                status TEXT DEFAULT 'pending',
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
            )
        `);

        // Booking history table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS booking_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
            )
        `);

        // Insert default resorts if table is empty
        const result = await db.get('SELECT COUNT(*) as count FROM resorts');
        if (result.count === 0) {
            await db.exec(`
                INSERT INTO resorts (name, location, price, description, images, videos, amenities, rating, available, max_guests, per_head_charge) VALUES
                ('Paradise Beach Resort', 'Goa', 5000, 'Luxury beachfront resort with stunning ocean views', 
                 '["https://resort3413.s3.amazonaws.com/public/images/paradise1.jpg", "https://resort3413.s3.amazonaws.com/public/images/paradise2.jpg"]',
                 '["https://resort3413.s3.amazonaws.com/public/videos/paradise-tour.mp4"]',
                 '["Swimming Pool", "Spa", "Restaurant", "WiFi"]', 4.5, 1, 8, 500),
                ('Mountain View Resort', 'Manali', 4000, 'Peaceful mountain retreat with breathtaking views',
                 '["https://resort3413.s3.amazonaws.com/public/images/mountain1.jpg", "https://resort3413.s3.amazonaws.com/public/images/mountain2.jpg"]',
                 '["https://resort3413.s3.amazonaws.com/public/videos/mountain-tour.mp4"]',
                 '["Gym", "Restaurant", "WiFi", "Parking"]', 4.2, 1, 10, 300),
                ('Sunset Villa Resort', 'Udaipur', 6000, 'Royal heritage resort with lake views',
                 '["https://resort3413.s3.amazonaws.com/public/images/sunset1.jpg", "https://resort3413.s3.amazonaws.com/public/images/sunset2.jpg"]',
                 '["https://resort3413.s3.amazonaws.com/public/videos/sunset-tour.mp4"]',
                 '["Lake View", "Heritage", "Restaurant", "WiFi"]', 4.7, 1, 12, 400)
            `);
            
            console.log('✅ Default resorts with S3 media URLs inserted');
        }
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

// Helper functions for booking history
async function addBookingHistory(bookingId, action, details = null) {
    try {
        await db.run(
            'INSERT INTO booking_history (booking_id, action, details) VALUES (?, ?, ?)',
            [bookingId, action, JSON.stringify(details)]
        );
    } catch (error) {
        console.error('Error adding booking history:', error);
    }
}

// Helper functions for transactions
async function addTransaction(bookingId, paymentId, amount, paymentMethod = 'online', status = 'pending') {
    try {
        const result = await db.run(
            'INSERT INTO transactions (booking_id, payment_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
            [bookingId, paymentId, amount, paymentMethod, status]
        );
        return result.lastID;
    } catch (error) {
        console.error('Error adding transaction:', error);
        return null;
    }
}

module.exports = { 
    db: () => db, 
    initDatabase, 
    addBookingHistory, 
    addTransaction 
};