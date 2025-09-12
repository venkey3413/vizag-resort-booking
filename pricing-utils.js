// Seasonal pricing utility functions

function getCurrentPrice(resort, checkInDate) {
    if (!resort.peak_price && !resort.off_peak_price) {
        return resort.price; // No seasonal pricing set
    }
    
    const checkIn = new Date(checkInDate);
    const month = checkIn.getMonth() + 1; // 1-12
    const day = checkIn.getDate();
    const currentDate = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    if (resort.peak_season_start && resort.peak_season_end) {
        const peakStart = resort.peak_season_start;
        const peakEnd = resort.peak_season_end;
        
        // Handle year-crossing seasons (e.g., 12-15 to 01-15)
        if (peakStart > peakEnd) {
            if (currentDate >= peakStart || currentDate <= peakEnd) {
                return resort.peak_price || resort.price;
            }
        } else {
            // Normal season within same year
            if (currentDate >= peakStart && currentDate <= peakEnd) {
                return resort.peak_price || resort.price;
            }
        }
        
        // Off-peak season
        return resort.off_peak_price || resort.price;
    }
    
    return resort.price;
}

function getPriceLabel(resort, checkInDate) {
    if (!resort.peak_price && !resort.off_peak_price) {
        return '';
    }
    
    const currentPrice = getCurrentPrice(resort, checkInDate);
    
    if (currentPrice === resort.peak_price) {
        return ' (Peak Season)';
    } else if (currentPrice === resort.off_peak_price) {
        return ' (Off-Peak)';
    }
    
    return '';
}

module.exports = { getCurrentPrice, getPriceLabel };