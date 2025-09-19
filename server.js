const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { publishEvent, EVENTS } = require('./eventbridge-service');
const { generatePaymentDetails } = require('./upi-service');
const { sendTelegramNotification, formatBookingNotification } = require('./telegram-service');


const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://vizagresortbooking.in'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Database
let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Add map_link column if it doesn't exist
    try {
        await db.run('ALTER TABLE resorts ADD COLUMN map_link TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add amenities column if it doesn't exist
    try {
        await db.run('ALTER TABLE resorts ADD COLUMN amenities TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add payment_status column if it doesn't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT "pending"');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add card_last_four column to payment_proofs if it doesn't exist
    try {
        await db.run('ALTER TABLE payment_proofs ADD COLUMN card_last_four TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add platform fee columns if they don't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN base_price INTEGER');
        await db.run('ALTER TABLE bookings ADD COLUMN platform_fee INTEGER');
        await db.run('ALTER TABLE bookings ADD COLUMN transaction_fee INTEGER DEFAULT 0');
    } catch (error) {
        // Columns already exist, ignore error
    }
    
    // Add booking reference column if it doesn't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN booking_reference TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add transaction_id column if it doesn't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN transaction_id TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    


    // Create tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resorts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            image TEXT,
            available INTEGER DEFAULT 1,
            map_link TEXT
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER,
            guest_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            guests INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            status TEXT DEFAULT 'pending_payment',
            booking_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS payment_proofs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            transaction_id TEXT NOT NULL,
            screenshot_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings (id)
        )
    `);

    // Insert sample resorts
    const resortCount = await db.get('SELECT COUNT(*) as count FROM resorts');
    if (resortCount.count === 0) {
        await db.run(`
            INSERT INTO resorts (name, location, price, description, image, map_link) VALUES
            ('Paradise Beach Resort', 'Goa', 5000, 'Luxury beachfront resort with stunning ocean views', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500', 'https://maps.google.com/?q=Goa'),
            ('Mountain View Resort', 'Manali', 4000, 'Peaceful mountain retreat with breathtaking views', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500', 'https://maps.google.com/?q=Manali'),
            ('Sunset Villa Resort', 'Udaipur', 6000, 'Royal heritage resort with lake views', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500', 'https://maps.google.com/?q=Udaipur')
        `);
    }
}

// Routes
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all('SELECT id, name, location, price, description, image, gallery, videos, map_link, amenities, available FROM resorts WHERE available = 1');
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests } = req.body;

        // Basic validation
        if (!resortId || !guestName || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Date validation
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (checkInDate < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }
        
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ error: 'Check-out date must be at least one day after check-in date' });
        }
        
        // Check for payment method specific booking limits per resort per day
        const todayStr = new Date().toISOString().split('T')[0];
        const existingBookings = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND (email = ? OR phone = ?) 
            AND DATE(booking_date) = ?
            AND payment_status != 'paid'
        `, [resortId, email, phone, todayStr]);
        
        // For UPI: max 2 bookings, For Card: max 1 booking per resort per day
        const maxBookings = 2; // This will be checked later based on payment method
        
        if (existingBookings.count >= maxBookings) {
            return res.status(400).json({ 
                error: 'Maximum booking limit reached for this resort today. Please try a different resort or date.' 
            });
        }

        // Get resort details
        const resort = await db.get('SELECT * FROM resorts WHERE id = ?', [resortId]);
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        // Check for existing paid bookings on the same dates
        const conflictingBooking = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND payment_status = 'paid'
            AND (
                (check_in <= ? AND check_out > ?) OR
                (check_in < ? AND check_out >= ?) OR
                (check_in >= ? AND check_out <= ?)
            )
        `, [resortId, checkIn, checkIn, checkOut, checkOut, checkIn, checkOut]);
        
        if (conflictingBooking.count > 0) {
            return res.status(400).json({ 
                error: 'Resort is not available for the selected dates. Please choose different dates.' 
            });
        }

        // Calculate total price with platform fee
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const basePrice = resort.price * nights;
        const platformFee = Math.round(basePrice * 0.015); // 1.5% platform fee
        const totalPrice = basePrice + platformFee;

        // Generate booking reference
        const bookingReference = `RB${String(Date.now()).slice(-6)}`;
        
        // Create booking
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, base_price, platform_fee, total_price, booking_reference)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [resortId, guestName, email, phone, checkIn, checkOut, guests, basePrice, platformFee, totalPrice, bookingReference]);

        // Generate UPI payment details
        const paymentDetails = generatePaymentDetails(totalPrice, result.lastID, guestName);
        
        const booking = {
            id: result.lastID,
            bookingReference: bookingReference,
            resortName: resort.name,
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            guests,
            basePrice,
            platformFee,
            totalPrice,
            status: 'pending_payment',
            paymentDetails: paymentDetails
        };

        // Publish booking created event
        try {
            await publishEvent('resort.booking', EVENTS.BOOKING_CREATED, {
                bookingId: result.lastID,
                resortId: resortId,
                guestName: guestName,
                totalPrice: totalPrice
            });
            // Broadcast to SSE clients
            broadcastToSSE({ type: 'booking.created', bookingId: result.lastID });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json(booking);
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.post('/api/bookings/:id/notify-card-payment', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { paymentId } = req.body;
        
        // Update booking with payment ID
        await db.run(
            'UPDATE bookings SET transaction_id = ? WHERE id = ?',
            [paymentId, bookingId]
        );
        
        // Get booking details for immediate notification
        const bookingDetails = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [bookingId]);
        
        if (bookingDetails) {
            const transactionFee = Math.round(bookingDetails.total_price * 0.015);
            const totalCardAmount = bookingDetails.total_price + transactionFee;
            
            // Send immediate Telegram notification
            try {
                const message = `💳 CARD PAYMENT SUCCESSFUL!

📋 Booking ID: ${bookingDetails.id}
👤 Guest: ${bookingDetails.guest_name}
📧 Email: ${bookingDetails.email}
📱 Phone: ${bookingDetails.phone}
🏨 Resort: ${bookingDetails.resort_name}
📅 Check-in: ${new Date(bookingDetails.check_in).toLocaleDateString('en-IN')}
📅 Check-out: ${new Date(bookingDetails.check_out).toLocaleDateString('en-IN')}
👥 Guests: ${bookingDetails.guests}
💰 Base Amount: ₹${bookingDetails.total_price.toLocaleString()}
💳 Transaction Fee: ₹${transactionFee.toLocaleString()}
💰 Total Paid: ₹${totalCardAmount.toLocaleString()}
🔢 Payment ID: ${paymentId}

⏰ Paid at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 Check Razorpay dashboard and mark as paid in booking panel`;
                
                await sendTelegramNotification(message);
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }
        
        res.json({ message: 'Card payment notification sent' });
    } catch (error) {
        console.error('Card payment notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

app.post('/api/bookings/:id/card-payment-proof', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { paymentId, cardLastFour } = req.body;
        
        // Get booking details to calculate transaction fee
        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        const transactionFee = Math.round(booking.total_price * 0.015);
        const totalCardAmount = booking.total_price + transactionFee;
        
        // Store card payment proof with transaction fee
        await db.run(`
            INSERT INTO payment_proofs (booking_id, transaction_id, card_last_four, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [bookingId, paymentId, cardLastFour]);
        
        // Update booking status to pending verification
        await db.run(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['pending_verification', bookingId]
        );
        
        // Get booking details for notification
        const bookingDetails = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [bookingId]);
        
        if (bookingDetails) {
            // Send Telegram notification for manual verification
            try {
                const message = `💳 CARD PAYMENT RECEIVED - NEEDS VERIFICATION

📋 Booking ID: ${bookingDetails.id}
👤 Guest: ${bookingDetails.guest_name}
🏨 Resort: ${bookingDetails.resort_name}
💰 Base Amount: ₹${bookingDetails.total_price.toLocaleString()}
💳 Transaction Fee: ₹${transactionFee.toLocaleString()}
💰 Total Paid: ₹${totalCardAmount.toLocaleString()}
🔢 Payment ID: ${paymentId}
💳 Card Last 4: ****${cardLastFour}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 Please verify and mark as paid in booking panel`;
                
                await sendTelegramNotification(message);
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }
        
        res.json({ message: 'Card payment submitted for verification' });
    } catch (error) {
        console.error('Card payment proof error:', error);
        res.status(500).json({ error: 'Failed to submit payment proof' });
    }
});

app.post('/api/bookings/:id/payment-proof', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { transactionId, paymentScreenshot } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        // Update booking status and transaction ID
        await db.run(
            'UPDATE bookings SET status = ?, payment_status = ?, transaction_id = ? WHERE id = ?',
            ['pending_verification', 'pending', transactionId, bookingId]
        );
        
        // Store payment proof (in production, store in S3)
        await db.run(
            'INSERT OR REPLACE INTO payment_proofs (booking_id, transaction_id, screenshot_data, created_at) VALUES (?, ?, ?, datetime("now"))',
            [bookingId, transactionId, paymentScreenshot || '']
        );
        
        // Send Telegram notification for payment submission
        try {
            const bookingDetails = await db.get(`
                SELECT b.*, r.name as resort_name 
                FROM bookings b 
                JOIN resorts r ON b.resort_id = r.id 
                WHERE b.id = ?
            `, [bookingId]);
            
            if (bookingDetails) {
                const message = `💳 PAYMENT SUBMITTED!

📋 Booking ID: ${bookingDetails.id}
👤 Guest: ${bookingDetails.guest_name}
🏖️ Resort: ${bookingDetails.resort_name}
💰 Amount: ₹${bookingDetails.total_price.toLocaleString()}
🔢 UTR ID: ${transactionId}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                
                await sendTelegramNotification(message);
            }
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        // Publish payment submitted event
        try {
            await publishEvent('resort.booking', EVENTS.PAYMENT_UPDATED, {
                bookingId: bookingId,
                paymentStatus: 'pending',
                transactionId: transactionId
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ message: 'Payment submitted for verification', status: 'pending_verification' });
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});



app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT 
                b.*,
                r.name as resort_name,
                COALESCE(b.booking_reference, 'RB' || SUBSTR('000000' || b.id, -6)) as booking_ref
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 

            ORDER BY b.booking_date DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('Booking fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});



// EventBridge Server-Sent Events endpoint
const sseClients = [];

app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // Add client to list
    sseClients.push(res);
    
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);
    
    req.on('close', () => {
        clearInterval(keepAlive);
        const index = sseClients.indexOf(res);
        if (index !== -1) sseClients.splice(index, 1);
    });
});

// Function to broadcast events to all SSE clients
function broadcastToSSE(eventData) {
    const message = `data: ${JSON.stringify(eventData)}\n\n`;
    sseClients.forEach(client => {
        try {
            client.write(message);
        } catch (error) {
            // Remove dead clients
            const index = sseClients.indexOf(client);
            if (index !== -1) sseClients.splice(index, 1);
        }
    });
}

// Endpoint to receive EventBridge notifications from admin server
app.post('/api/eventbridge-notify', (req, res) => {
    const { type, data } = req.body;
    console.log(`📡 Received EventBridge notification: ${type}`);
    broadcastToSSE({ type, ...data });
    res.json({ success: true });
});

// Endpoint to get Razorpay key for frontend
app.get('/api/razorpay-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// Endpoint to check card payment limits
app.post('/api/check-card-limit', async (req, res) => {
    try {
        const { bookingId } = req.body;
        
        // Get booking details
        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check existing card payments for same resort, email/phone, today (unpaid only)
        const existingCardBookings = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings b
            JOIN payment_proofs p ON b.id = p.booking_id
            WHERE b.resort_id = ? 
            AND (b.email = ? OR b.phone = ?) 
            AND DATE(b.booking_date) = ?
            AND b.payment_status != 'paid'
            AND p.transaction_id LIKE 'pay_%'
        `, [booking.resort_id, booking.email, booking.phone, todayStr]);
        
        if (existingCardBookings.count >= 1) {
            return res.status(400).json({ 
                error: 'Only 1 card payment allowed per resort per day. Use UPI for additional bookings.' 
            });
        }
        
        res.json({ message: 'Card payment allowed' });
    } catch (error) {
        console.error('Card limit check error:', error);
        res.status(500).json({ error: 'Failed to check card payment limit' });
    }
});

// Endpoint to get payment proof details for invoice generation
app.get('/api/payment-proof/:bookingId', async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const proof = await db.get(
            'SELECT transaction_id, card_last_four FROM payment_proofs WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
            [bookingId]
        );
        
        if (proof) {
            res.json(proof);
        } else {
            res.json({ transaction_id: null, card_last_four: null });
        }
    } catch (error) {
        console.error('Payment proof fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch payment proof' });
    }
});

// Initialize and start server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Resort Booking Server running on http://0.0.0.0:${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
});