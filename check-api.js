const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./resort_booking.db');

// Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.log('❌ Error:', err.message);
        return;
    }
    console.log('📋 Tables:', tables.map(t => t.name));
    
    // Sample queries for common tables
    const queries = [
        "SELECT COUNT(*) as count FROM bookings",
        "SELECT COUNT(*) as count FROM users", 
        "SELECT COUNT(*) as count FROM resorts"
    ];
    
    queries.forEach(query => {
        db.get(query, (err, row) => {
            if (!err && row) {
                console.log(`✅ ${query}: ${row.count} records`);
            }
        });
    });
    
    db.close();
});
