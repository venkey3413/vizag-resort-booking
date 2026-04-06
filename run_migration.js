const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./resort_booking.db');

console.log('🔄 Running database migration...');

db.serialize(() => {
    // Add qr_code column
    db.run(`ALTER TABLE bookings ADD COLUMN qr_code TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Error adding qr_code column:', err.message);
        } else {
            console.log('✅ qr_code column added');
        }
    });

    // Add checked_in column
    db.run(`ALTER TABLE bookings ADD COLUMN checked_in INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Error adding checked_in column:', err.message);
        } else {
            console.log('✅ checked_in column added');
        }
    });

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_booking_reference ON bookings(booking_reference)`, (err) => {
        if (err) {
            console.error('❌ Error creating booking_reference index:', err.message);
        } else {
            console.log('✅ booking_reference index created');
        }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_checked_in ON bookings(checked_in)`, (err) => {
        if (err) {
            console.error('❌ Error creating checked_in index:', err.message);
        } else {
            console.log('✅ checked_in index created');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err.message);
    } else {
        console.log('✅ Migration completed successfully!');
    }
});
