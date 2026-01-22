const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./resort_booking.db', (err) => {
    if (err) {
        console.log('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Database connected successfully');
    
    db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
            console.log('❌ Database query failed:', err.message);
        } else {
            console.log('✅ Database is active and accessible');
            if (row) {
                console.log('✅ Tables exist in database');
            } else {
                console.log('⚠️ No tables found in database');
            }
        }
        db.close();
    });
});
