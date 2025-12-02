const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
}

// Check availability for a resort on specific dates
async function checkAvailability(resortId, checkIn, checkOut) {
    try {
        // Check for blocked dates (only check-in date)
        try {
            const blockedCheckIn = await db.get(
                'SELECT block_date FROM resort_blocks WHERE resort_id = ? AND block_date = ?',
                [resortId, checkIn]
            );
            
            if (blockedCheckIn) {
                return { 
                    available: false,
                    error: `Resort is not available for check-in on ${new Date(checkIn).toLocaleDateString()}` 
                };
            }
        } catch (error) {
            console.log('Resort blocks table not found, skipping blocked date check');
        }
        
        // Check for owner-blocked dates
        try {
            const ownerBlockedCheckIn = await db.get(
                'SELECT blocked_date FROM resort_availability WHERE resort_id = ? AND blocked_date = ?',
                [resortId, checkIn]
            );
            
            if (ownerBlockedCheckIn) {
                return { 
                    available: false,
                    error: `🚫 This date is blocked by the resort owner. Please choose another date.`
                };
            }
        } catch (error) {
            console.log('Resort availability table not found, skipping owner blocked date check');
        }
        
        // Check if resort is already booked for the requested check-in date
        const paidBookingForDate = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND payment_status = 'paid'
            AND check_in <= ? AND check_out > ?
        `, [resortId, checkIn, checkIn]);
        
        if (paidBookingForDate.count > 0) {
            return { 
                available: false,
                error: `This resort is already booked for ${new Date(checkIn).toLocaleDateString()}. Please choose a different date.` 
            };
        }
        
        // Check unpaid bookings limit
        const unpaidBookingsForDate = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND check_in <= ? AND check_out > ?
            AND payment_status != 'paid'
        `, [resortId, checkIn, checkIn]);
        
        if (unpaidBookingsForDate.count >= 2) {
            return { 
                available: false,
                error: `Maximum 2 pending bookings allowed for ${new Date(checkIn).toLocaleDateString()}. Please wait for verification or choose another date.` 
            };
        }
        
        return { available: true };
    } catch (error) {
        console.error('Availability check error:', error);
        return { 
            available: false,
            error: 'Failed to check availability' 
        };
    }
}

module.exports = {
    initDB,
    checkAvailability
};