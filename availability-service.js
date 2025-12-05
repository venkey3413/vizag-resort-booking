const axios = require('axios');

const DB_API_URL = process.env.DB_API_URL || 'http://centralized-db-api:3003';

async function initDB() {
    // No database initialization needed - using API
}

// Check availability for a resort on specific dates with pricing validation
async function checkAvailability(resortId, checkIn, checkOut, expectedPrice) {
    try {
        // Get resort details from API
        const resortResponse = await axios.get(`${DB_API_URL}/api/resorts/${resortId}`);
        const resort = resortResponse.data;
        
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
        if (resort.dynamic_pricing && resort.dynamic_pricing.length > 0) {
            const dynamicPricing = resort.dynamic_pricing;
            
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
        
        // Check for blocked dates via API
        try {
            const blockedResponse = await axios.get(`${DB_API_URL}/api/blocked-dates/${resortId}`);
            const blockedDates = blockedResponse.data;
            
            const isBlocked = blockedDates.some(blocked => 
                blocked.block_date === checkIn || blocked.blocked_date === checkIn
            );
            
            if (isBlocked) {
                return { 
                    available: false,
                    error: `🚫 This date is blocked. Please choose another date.`
                };
            }
        } catch (error) {
            console.log('No blocked dates found or API error:', error.message);
        }
        
        // Check bookings via API
        const bookingsResponse = await axios.get(`${DB_API_URL}/api/bookings`);
        const allBookings = bookingsResponse.data;
        
        // Filter bookings for this resort and date
        const resortBookings = allBookings.filter(booking => 
            booking.resort_id == resortId &&
            booking.check_in <= checkIn && booking.check_out > checkIn
        );
        
        const paidBookings = resortBookings.filter(b => b.payment_status === 'paid');
        const unpaidBookings = resortBookings.filter(b => b.payment_status !== 'paid');
        
        if (paidBookings.length > 0) {
            return { 
                available: false,
                error: `This resort is already booked for ${new Date(checkIn).toLocaleDateString()}. Please choose a different date.` 
            };
        }
        
        if (unpaidBookings.length >= 2) {
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