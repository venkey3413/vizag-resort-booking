const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { publishEvent, EVENTS } = require('./eventbridge-service');
// UPI service removed - generate payment details inline
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
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resort_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER NOT NULL,
            block_date DATE NOT NULL,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (resort_id) REFERENCES resorts (id)
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
        
        // Add dynamic pricing to each resort
        for (let resort of resorts) {
            try {
                const pricing = await db.all(
                    'SELECT day_type, price FROM dynamic_pricing WHERE resort_id = ?',
                    [resort.id]
                );
                resort.dynamic_pricing = pricing;
            } catch (error) {
                // Dynamic pricing table might not exist yet
                resort.dynamic_pricing = [];
            }
        }
        
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/check-availability', async (req, res) => {
    try {
        const { resortId, checkIn, checkOut } = req.body;
        
        // Check for blocked dates
        try {
            const blockedCheckIn = await db.get(
                'SELECT block_date FROM resort_blocks WHERE resort_id = ? AND block_date = ?',
                [resortId, checkIn]
            );
            
            if (blockedCheckIn) {
                return res.status(400).json({ 
                    error: `Resort is not available for check-in on ${new Date(checkIn).toLocaleDateString()}` 
                });
            }
        } catch (error) {
            console.log('Resort blocks table not found, skipping blocked date check');
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
            return res.status(400).json({ 
                error: `This resort is already booked for ${new Date(checkIn).toLocaleDateString()}. Please choose a different date.` 
            });
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
            return res.status(400).json({ 
                error: `Maximum 2 pending bookings allowed for ${new Date(checkIn).toLocaleDateString()}. Please wait for verification or choose another date.` 
            });
        }
        
        res.json({ available: true });
    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { resortId, guestName, email, phone, checkIn, checkOut, guests, couponCode, discountAmount, transactionId } = req.body;

        // Basic validation
        if (!resortId || !guestName || !email || !phone || !checkIn || !checkOut || !guests) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Date validation - allow today and future dates
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const todayDate = new Date().toISOString().split('T')[0];
        
        if (checkIn < todayDate) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }
        
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ error: 'Check-out date must be at least one day after check-in date' });
        }
        
        // Define today string for queries
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check for unpaid bookings for this resort and check-in date (max 2 total)
        const unpaidBookingsForDate = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND check_in <= ? AND check_out > ?
            AND payment_status != 'paid'
        `, [resortId, checkIn, checkIn]);
        
        if (unpaidBookingsForDate.count >= 2) {
            return res.status(400).json({ 
                error: `Maximum 2 pending bookings allowed for ${new Date(checkIn).toLocaleDateString()}. Please wait for verification or choose another date.` 
            });
        }

        // Get resort details
        const resort = await db.get('SELECT * FROM resorts WHERE id = ?', [resortId]);
        if (!resort) {
            return res.status(404).json({ error: 'Resort not found' });
        }
        
        // Check for blocked dates (only check-in date)
        try {
            const blockedCheckIn = await db.get(
                'SELECT block_date FROM resort_blocks WHERE resort_id = ? AND block_date = ?',
                [resortId, checkIn]
            );
            
            if (blockedCheckIn) {
                return res.status(400).json({ 
                    error: `Resort is not available for check-in on ${new Date(checkIn).toLocaleDateString()}` 
                });
            }
        } catch (error) {
            console.log('Resort blocks table not found, skipping blocked date check');
        }
        
        // Check if resort is already booked for the requested check-in date
        // Allow booking on checkout date since checkout is 9 AM
        const paidBookingForDate = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND payment_status = 'paid'
            AND check_in <= ? AND check_out > ?
        `, [resortId, checkIn, checkIn]);
        
        if (paidBookingForDate.count > 0) {
            return res.status(400).json({ 
                error: `This resort is already booked for ${new Date(checkIn).toLocaleDateString()}. Please choose a different date.` 
            });
        }

        // Calculate total price with dynamic pricing
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        
        // Get dynamic pricing based on check-in date only
        const checkInDayOfWeek = checkInDate.getDay();
        let nightlyRate = resort.price;
        
        try {
            const dynamicPricing = await db.all(
                'SELECT day_type, price FROM dynamic_pricing WHERE resort_id = ?',
                [resortId]
            );
            
            if (dynamicPricing.length > 0) {
                // Check if check-in is weekend (Saturday=6, Sunday=0)
                if (checkInDayOfWeek === 0 || checkInDayOfWeek === 6) {
                    const weekendPrice = dynamicPricing.find(p => p.day_type === 'weekend');
                    if (weekendPrice) nightlyRate = weekendPrice.price;
                } else {
                    // Weekday (Monday=1 to Friday=5)
                    const weekdayPrice = dynamicPricing.find(p => p.day_type === 'weekday');
                    if (weekdayPrice) nightlyRate = weekdayPrice.price;
                }
            }
        } catch (error) {
            // Dynamic pricing table might not exist yet, use base price
        }
        
        const basePrice = nightlyRate * nights;
        
        const platformFee = Math.round(basePrice * 0.015); // 1.5% platform fee
        const subtotal = basePrice + platformFee;
        const discount = discountAmount || 0;
        const totalPrice = subtotal - discount;

        // Generate booking reference
        const bookingReference = `RB${String(Date.now()).slice(-6)}`;
        
        // Add coupon columns to bookings table if they don't exist
        try {
            await db.run('ALTER TABLE bookings ADD COLUMN coupon_code TEXT');
            await db.run('ALTER TABLE bookings ADD COLUMN discount_amount INTEGER DEFAULT 0');
        } catch (error) {
            // Columns already exist, ignore error
        }
        
        // Set initial status based on whether payment info is provided
        const initialStatus = transactionId ? 'pending_verification' : 'pending_payment';
        const paymentStatus = transactionId ? 'pending' : 'pending';
        
        // Create booking
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, base_price, platform_fee, total_price, booking_reference, coupon_code, discount_amount, status, payment_status, transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [resortId, guestName, email, phone, checkIn, checkOut, guests, basePrice, platformFee, totalPrice, bookingReference, couponCode, discount, initialStatus, paymentStatus, transactionId]);
        
        // Store payment proof if transactionId provided
        if (transactionId) {
            await db.run(
                'INSERT INTO payment_proofs (booking_id, transaction_id, created_at) VALUES (?, ?, datetime("now"))',
                [result.lastID, transactionId]
            );
            
            // Send Telegram notification for payment submission
            try {
                const message = `💳 PAYMENT SUBMITTED!

📋 Booking ID: ${bookingReference}
👤 Guest: ${guestName}
🏖️ Resort: ${resort.name}
💰 Amount: ₹${totalPrice.toLocaleString()}
🔢 UTR ID: ${transactionId}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                
                await sendTelegramNotification(message);
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }

        // Generate UPI payment details
        const paymentDetails = {
            upiId: 'venkatesh3413@paytm',
            amount: totalPrice,
            note: `Booking ${bookingReference} - ${guestName}`
        };
        
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

📋 Booking ID: ${bookingDetails.booking_reference || `RB${String(bookingDetails.id).padStart(6, '0')}`}
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

📋 Booking ID: ${bookingDetails.booking_reference || `RB${String(bookingDetails.id).padStart(6, '0')}`}
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

app.post('/api/bookings/:id/notify-no-utr', async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Get booking details
        const bookingDetails = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [bookingId]);
        
        if (bookingDetails) {
            // Send Telegram notification
            try {
                const message = `⚠️ BOOKING CONFIRMATION WITHOUT UTR!

📋 Booking ID: ${bookingDetails.booking_reference || `RB${String(bookingDetails.id).padStart(6, '0')}`}
👤 Guest: ${bookingDetails.guest_name}
📧 Email: ${bookingDetails.email}
📱 Phone: ${bookingDetails.phone}
🏨 Resort: ${bookingDetails.resort_name}
📅 Check-in: ${new Date(bookingDetails.check_in).toLocaleDateString('en-IN')}
📅 Check-out: ${new Date(bookingDetails.check_out).toLocaleDateString('en-IN')}
👥 Guests: ${bookingDetails.guests}
💰 Amount: ₹${bookingDetails.total_price.toLocaleString()}

❌ Customer clicked confirm without entering UTR
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 Follow up with customer for payment`;
                
                await sendTelegramNotification(message);
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }
        
        res.json({ message: 'No-UTR notification sent' });
    } catch (error) {
        console.error('No-UTR notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
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

📋 Booking ID: ${bookingDetails.booking_reference || `RB${String(bookingDetails.id).padStart(6, '0')}`}
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

// Endpoint to get active coupons
app.get('/api/coupons', async (req, res) => {
    try {
        const { checkIn } = req.query;
        let coupons;
        
        if (checkIn) {
            const checkInDate = new Date(checkIn);
            const dayOfWeek = checkInDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'weekend' : 'weekday';
            
            coupons = await db.all(
                'SELECT * FROM coupons WHERE day_type = ? OR day_type = "all" ORDER BY created_at DESC',
                [dayType]
            );
        } else {
            coupons = await db.all('SELECT * FROM coupons ORDER BY created_at DESC');
        }
        
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
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
        
        // Check if resort already has paid booking for the check-in date
        const paidBookingForDate = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND payment_status = 'paid'
            AND check_in <= ? AND check_out > ?
        `, [booking.resort_id, booking.check_in, booking.check_in]);
        
        if (paidBookingForDate.count > 0) {
            return res.status(400).json({ 
                error: `This resort is already booked for ${new Date(booking.check_in).toLocaleDateString()}. Please choose a different date.` 
            });
        }
        
        // Check unpaid bookings limit for the check-in date (max 2 total)
        const unpaidBookingsForDate = await db.get(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE resort_id = ? 
            AND check_in <= ? AND check_out > ?
            AND payment_status != 'paid'
        `, [booking.resort_id, booking.check_in, booking.check_in]);
        
        if (unpaidBookingsForDate.count >= 2) {
            return res.status(400).json({ 
                error: `Maximum 2 pending bookings allowed for ${new Date(booking.check_in).toLocaleDateString()}. Please wait for verification.` 
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