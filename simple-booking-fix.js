// Simple booking endpoint fix - replace the problematic booking code

app.post('/api/bookings', async (req, res) => {
    console.log('Booking request received:', req.body);
    
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, paymentId } = req.body;
        
        // Basic validation
        if (!resortId || !guestName || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Get resort info
        const resort = await db().get('SELECT * FROM resorts WHERE id = ?', [parseInt(resortId)]);
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        // Calculate price
        const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 3600 * 24)));
        const totalPrice = resort.price * nights;
        
        // Create booking (simplified - no encryption, no email)
        const result = await db().run(
            'INSERT INTO bookings (resort_id, resort_name, guest_name, email, phone, check_in, check_out, guests, total_price, payment_id, status, payment_status, booking_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [parseInt(resortId), resort.name, guestName, email, phone, checkIn, checkOut, parseInt(guests), totalPrice, paymentId || 'CASH_' + Date.now(), 'confirmed', 'pending', new Date().toISOString()]
        );
        
        const bookingId = result.lastID;
        const bookingReference = `RB${String(bookingId).padStart(4, '0')}`;
        
        console.log('Booking created successfully:', bookingReference);
        
        // Return success
        res.json({
            id: bookingId,
            bookingReference,
            totalPrice,
            message: 'Booking confirmed!'
        });
        
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }
});