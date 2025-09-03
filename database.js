const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'resort_user',
    password: 'ResortPass123!',
    database: 'resort_booking'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and tables
async function initDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Create database if not exists
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();

        // Create tables
        await createTables();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
}

// Create tables
async function createTables() {
    const connection = await pool.getConnection();
    
    try {
        // Resorts table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS resorts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
                price INT NOT NULL,
                description TEXT,
                image VARCHAR(500),
                amenities JSON,
                rating DECIMAL(2,1) DEFAULT 0,
                available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bookings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resort_id INT,
                resort_name VARCHAR(255),
                guest_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                guests INT NOT NULL,
                total_price INT NOT NULL,
                status VARCHAR(50) DEFAULT 'confirmed',
                booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE SET NULL
            )
        `);

        // Add available column if it doesn't exist
        try {
            await connection.execute('ALTER TABLE resorts ADD COLUMN available BOOLEAN DEFAULT TRUE');
        } catch (e) {
            // Column already exists
        }

        // Insert default resorts if table is empty
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM resorts');
        if (rows[0].count === 0) {
            await connection.execute(`
                INSERT INTO resorts (name, location, price, description, image, amenities, rating, available) VALUES
                ('Paradise Beach Resort', 'Goa', 5000, 'Luxury beachfront resort with stunning ocean views', '/uploads/default-resort.jpg', '["Swimming Pool", "Spa", "Restaurant", "WiFi"]', 4.5, TRUE),
                ('Mountain View Resort', 'Manali', 4000, 'Peaceful mountain retreat with breathtaking views', '/uploads/default-resort.jpg', '["Gym", "Restaurant", "WiFi", "Parking"]', 4.2, TRUE)
            `);
        }

    } finally {
        connection.release();
    }
}

module.exports = { pool, initDatabase };