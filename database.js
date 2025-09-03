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
        // Resorts table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS resorts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                price INTEGER NOT NULL,
                description TEXT,
                image TEXT,
                images TEXT,
                amenities TEXT,
                rating REAL DEFAULT 0,
                available INTEGER DEFAULT 1,
                max_guests INTEGER DEFAULT 10,
                per_head_charge INTEGER DEFAULT 300,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
                status TEXT DEFAULT 'confirmed',
                booking_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default resorts if table is empty
        const result = await db.get('SELECT COUNT(*) as count FROM resorts');
        if (result.count === 0) {
            await db.exec(`
                INSERT INTO resorts (name, location, price, description, image, images, amenities, rating, available, max_guests, per_head_charge) VALUES
                ('Paradise Beach Resort', 'Goa', 5000, 'Luxury beachfront resort with stunning ocean views', '/uploads/default-resort.jpg', '["/uploads/default-resort.jpg", "/uploads/default-resort.jpg", "/uploads/default-resort.jpg"]', '["Swimming Pool", "Spa", "Restaurant", "WiFi"]', 4.5, 1, 8, 500),
                ('Mountain View Resort', 'Manali', 4000, 'Peaceful mountain retreat with breathtaking views', '/uploads/default-resort.jpg', '["/uploads/default-resort.jpg", "/uploads/default-resort.jpg", "/uploads/default-resort.jpg"]', '["Gym", "Restaurant", "WiFi", "Parking"]', 4.2, 1, 10, 300),
                ('Sunset Villa Resort', 'Udaipur', 6000, 'Royal heritage resort with lake views', '/uploads/default-resort.jpg', '["/uploads/default-resort.jpg", "/uploads/default-resort.jpg", "/uploads/default-resort.jpg"]', '["Lake View", "Heritage", "Restaurant", "WiFi"]', 4.7, 1, 12, 400)
            `);
            
            console.log('✅ Default resorts with multiple images inserted');
        }
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

module.exports = { db: () => db, initDatabase };