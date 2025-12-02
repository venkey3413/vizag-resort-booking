const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
}

// Check availability for a resort on specific dates with pricing validation
async function checkAvailability(resortId, checkIn, checkOut, expectedPrice) {
    try {
        // Get resort details with dynamic pricing
        const resort = await db.get(`
            SELECT r.*, 
                   GROUP_CONCAT(dp.day_type || ':' || dp.price) as dynamic_pricing_raw
            FROM resorts r
            LEFT JOIN dynamic_pricing dp ON r.id = dp.resort_id
            WHERE r.id = ?
            GROUP BY r.id
        `, [resortId]);
        
        if (!resort) {
            return { available: false, error: 'Resort not found' };
        }
        
        // Calculate correct pricing
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const checkInDayOfWeek = checkInDate.getDay();
        let nightlyRate = resort.price;
        
        // Apply dynamic pricing
        if (resort.dynamic_pricing_raw) {
            const dynamicPricing = resort.dynamic_pricing_raw.split(',').map(item => {
                const [day_type, price] = item.split(':');
                return { day_type, price: parseInt(price) };
            });
            
            if (checkInDayOfWeek === 5) {
                const fridayPrice = dynamicPricing.find(p => p.day_type === 'friday');
                if (fridayPrice) nightlyRate = fridayPrice.price;
            } else if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
                const weekendPrice = dynamicPricing.find(p => p.day_type === 'weekend');
                if (weekendPrice) nightlyRate = weekendPrice.price;
            } else {
                const weekdayPrice = dynamicPricing.find(p => p.day_type === 'weekday');
                if (weekdayPrice) nightlyRate = weekdayPrice.price;
            }
        }
        
        const basePrice = nightlyRate * nights;
        const platformFee = Math.round(basePrice * 0.015);
        const correctTotalPrice = basePrice + platformFee;
        
        // Validate pricing if expectedPrice is provided
        if (expectedPrice && Math.abs(expectedPrice - correctTotalPrice) > 1) {
            return {
                available: false,
                error: `Price mismatch. Expected: ₹${correctTotalPrice.toLocaleString()}, Got: ₹${expectedPrice.toLocaleString()}. Please refresh and try again.`,
                correctPrice: correctTotalPrice
            };
        }
        
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