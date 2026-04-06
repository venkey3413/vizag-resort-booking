const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function addQRColumns() {
    const db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });

    try {
        // Check if qr_code column exists
        const tableInfo = await db.all("PRAGMA table_info(bookings)");
        const hasQRCode = tableInfo.some(col => col.name === 'qr_code');
        const hasCheckedIn = tableInfo.some(col => col.name === 'checked_in');

        if (!hasQRCode) {
            console.log('Adding qr_code column...');
            await db.exec('ALTER TABLE bookings ADD COLUMN qr_code TEXT');
            console.log('✅ qr_code column added');
        } else {
            console.log('✅ qr_code column already exists');
        }

        if (!hasCheckedIn) {
            console.log('Adding checked_in column...');
            await db.exec('ALTER TABLE bookings ADD COLUMN checked_in INTEGER DEFAULT 0');
            console.log('✅ checked_in column added');
        } else {
            console.log('✅ checked_in column already exists');
        }

        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await db.close();
    }
}

addQRColumns();
