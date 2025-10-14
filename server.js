require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { publishEvent, EVENTS } = require('./eventbridge-service');
const eventBridgeListener = require('./eventbridge-listener');
// UPI service removed - generate payment details inline
const { sendTelegramNotification, formatBookingNotification } = require('./telegram-service');
const { sendInvoiceEmail } = require('./email-service');
const AWS = require('aws-sdk');

const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

// S3 backup function
async function backupInvoiceToS3(invoiceData, type) {
    try {
        const invoiceContent = JSON.stringify(invoiceData, null, 2);
        const fileName = type === 'food' 
            ? `food-invoices/${invoiceData.orderId}-${Date.now()}.json`
            : `resort-invoices/${invoiceData.booking_reference || invoiceData.id}-${Date.now()}.json`;
        
        const params = {
            Bucket: 'vizag-resort-backups',
            Key: fileName,
            Body: invoiceContent,
            ContentType: 'application/json'
        };
        
        await s3.upload(params).promise();
        console.log(`Invoice backed up to S3: ${fileName}`);
    } catch (error) {
        console.error('S3 backup error:', error);
        throw error;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Input sanitization function
function sanitizeInput(input) {
    if (typeof input !== 'string') return String(input || '');
    return input.replace(/[<>"'&]/g, function(match) {
        const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
        return map[match];
    });
}

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://vizagresortbooking.in'] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    // HSTS disabled to allow HTTP on ports 3001/3002
    // res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

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
    
    // Create resort owners table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resort_owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            resort_ids TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create resort availability table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resort_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER NOT NULL,
            blocked_date DATE NOT NULL,
            reason TEXT,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (resort_id) REFERENCES resorts (id),
            FOREIGN KEY (created_by) REFERENCES resort_owners (id)
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
    
    // Initialize food orders and items tables
    await initFoodOrdersTable();
    await initFoodItemsTable();
    await initTravelPackagesTable();
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
        
        // Check for blocked dates (both old and new tables)
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
        
        // Check for owner-blocked dates
        try {
            const ownerBlockedCheckIn = await db.get(
                'SELECT blocked_date FROM resort_availability WHERE resort_id = ? AND blocked_date = ?',
                [resortId, checkIn]
            );
            
            if (ownerBlockedCheckIn) {
                return res.status(400).json({ 
                    error: `Resort is not available for check-in on ${new Date(checkIn).toLocaleDateString()} (blocked by owner)` 
                });
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

        // Enhanced input sanitization
        const sanitizedData = {
            resortId: parseInt(resortId) || 0,
            guestName: sanitizeInput(guestName).substring(0, 100),
            email: sanitizeInput(email).substring(0, 100),
            phone: sanitizeInput(phone).substring(0, 20),
            checkIn: sanitizeInput(checkIn).substring(0, 10),
            checkOut: sanitizeInput(checkOut).substring(0, 10),
            guests: Math.max(1, Math.min(20, parseInt(guests) || 1)),
            transactionId: sanitizeInput(transactionId || '').substring(0, 50)
        };
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedData.email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Phone validation
        if (!sanitizedData.phone.match(/^\+91[0-9]{10}$/)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Basic validation
        if (!sanitizedData.resortId || !sanitizedData.guestName || !sanitizedData.email || !sanitizedData.phone || !sanitizedData.checkIn || !sanitizedData.checkOut || !sanitizedData.guests) {
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
        
        // Check for owner-blocked dates
        try {
            const ownerBlockedCheckIn = await db.get(
                'SELECT blocked_date FROM resort_availability WHERE resort_id = ? AND blocked_date = ?',
                [resortId, checkIn]
            );
            
            if (ownerBlockedCheckIn) {
                return res.status(400).json({ 
                    error: `Resort is not available for check-in on ${new Date(checkIn).toLocaleDateString()} (blocked by owner)` 
                });
            }
        } catch (error) {
            console.log('Resort availability table not found, skipping owner blocked date check');
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
        
        // Create booking with sanitized data
        const result = await db.run(`
            INSERT INTO bookings (resort_id, guest_name, email, phone, check_in, check_out, guests, base_price, platform_fee, total_price, booking_reference, coupon_code, discount_amount, status, payment_status, transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [sanitizedData.resortId, sanitizedData.guestName, sanitizedData.email, sanitizedData.phone, sanitizedData.checkIn, sanitizedData.checkOut, sanitizedData.guests, basePrice, platformFee, totalPrice, bookingReference, couponCode, discount, initialStatus, paymentStatus, sanitizedData.transactionId]);
        
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
            await publishEvent('vizag.resort', EVENTS.BOOKING_CREATED, {
                bookingId: result.lastID,
                resortId: resortId,
                guestName: guestName,
                totalPrice: totalPrice
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.BOOKING_CREATED, 'vizag.resort', {
                bookingId: result.lastID,
                resortId: resortId,
                guestName: guestName
            });
            
            // Notify booking server directly
            const bookingServerUrl = 'http://localhost:3002/api/eventbridge-notify';
            await fetch(bookingServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'booking.created',
                    source: 'vizag.resort',
                    data: { bookingId: result.lastID, guestName }
                })
            }).catch(err => console.log('Booking server notification failed:', err.message));
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
            await publishEvent('vizag.resort', EVENTS.PAYMENT_UPDATED, {
                bookingId: bookingId,
                paymentStatus: 'pending',
                transactionId: transactionId
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.PAYMENT_UPDATED, 'vizag.resort', {
                bookingId: bookingId,
                paymentStatus: 'pending'
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



// Real-time EventBridge listener endpoint
app.get('/api/events', (req, res) => {
    const clientId = `main-${Date.now()}-${Math.random()}`;
    eventBridgeListener.subscribe(clientId, res, 'main');
    console.log('📡 Main website connected to EventBridge');
});

// EventBridge notification endpoint
app.post('/api/eventbridge-notify', (req, res) => {
    const { type, source, data } = req.body;
    console.log(`📡 Received EventBridge notification: ${type}`);
    eventBridgeListener.handleEvent(type, source, data);
    res.json({ success: true });
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









// Debug endpoint to check environment variables (remove in production)
app.get('/api/debug-env', (req, res) => {
    res.json({
        hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
        razorpayKeyLength: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 0,
        nodeEnv: process.env.NODE_ENV || 'development'
    });
});

// Endpoint to get Razorpay key for frontend
app.get('/api/razorpay-key', (req, res) => {
    const key = process.env.RAZORPAY_KEY_ID;
    console.log('🔑 Razorpay key request - Key available:', !!key);
    console.log('🔑 Key length:', key ? key.length : 0);
    
    if (!key) {
        console.error('❌ RAZORPAY_KEY_ID not found in environment variables');
        console.error('❌ Available env vars:', Object.keys(process.env).filter(k => k.includes('RAZOR')));
        return res.status(500).json({ 
            error: 'Payment system not configured. Please contact support.',
            key: null 
        });
    }
    
    res.json({ key: key });
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

// Endpoint to get blocked dates for calendar
app.get('/api/blocked-dates/:resortId', async (req, res) => {
    try {
        const { resortId } = req.params;
        const blockedDates = [];
        
        // Get admin blocked dates
        try {
            const adminBlocks = await db.all(
                'SELECT block_date FROM resort_blocks WHERE resort_id = ?',
                [resortId]
            );
            adminBlocks.forEach(block => blockedDates.push(block.block_date));
        } catch (error) {
            // Table might not exist
        }
        
        // Get owner blocked dates
        try {
            const ownerBlocks = await db.all(
                'SELECT blocked_date FROM resort_availability WHERE resort_id = ?',
                [resortId]
            );
            ownerBlocks.forEach(block => blockedDates.push(block.blocked_date));
        } catch (error) {
            // Table might not exist
        }
        
        res.json(blockedDates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blocked dates' });
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

// Email validation endpoint
app.post('/api/validate-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Basic format validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.json({ valid: false, reason: 'Invalid format' });
        }
        
        // Check for common disposable email domains
        const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com'];
        const domain = email.split('@')[1].toLowerCase();
        
        if (disposableDomains.includes(domain)) {
            return res.json({ valid: false, reason: 'Disposable email not allowed' });
        }
        
        // For now, return valid for proper format emails
        // You can integrate with email validation services like:
        // - EmailJS validation API
        // - Hunter.io API
        // - ZeroBounce API
        
        res.json({ valid: true, reason: 'Valid email format' });
    } catch (error) {
        console.error('Email validation error:', error);
        res.status(500).json({ valid: false, reason: 'Validation service error' });
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

// Food service routes
app.use('/food', express.static('food-public'));

app.get('/food', (req, res) => {
    res.sendFile(__dirname + '/food-public/index.html');
});

// Travel service routes
app.use('/travel', express.static('travel-public'));

app.get('/travel', (req, res) => {
    res.sendFile(__dirname + '/travel-public/index.html');
});

// Validate booking ID for food orders
app.get('/api/validate-booking/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        // Check if booking exists and is confirmed (paid)
        const booking = await db.get(`
            SELECT b.id, b.booking_reference, b.guest_name, b.email, b.phone, b.check_in, r.name as resort_name
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE (b.booking_reference = ? OR b.id = ?) AND b.payment_status = 'paid'
        `, [bookingId, bookingId]);
        
        if (!booking) {
            return res.status(404).json({ 
                valid: false, 
                error: 'Invalid booking ID or booking not confirmed' 
            });
        }
        
        // Allow food orders for any future check-in date
        const now = new Date();
        const checkInDate = new Date(booking.check_in);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        
        // Only block orders for past check-in dates
        if (checkInDate.getTime() < today.getTime()) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Cannot order food for past check-in dates' 
            });
        }
        
        // If check-in is today, check if it's past 10 PM
        if (checkInDate.getTime() === today.getTime()) {
            const checkIn10PM = new Date(checkInDate);
            checkIn10PM.setHours(22, 0, 0, 0);
            
            if (now > checkIn10PM) {
                return res.status(400).json({ 
                    valid: false, 
                    error: 'Food orders are only accepted until 10 PM on the check-in date' 
                });
            }
        }
        
        res.json({ 
            valid: true, 
            booking: {
                id: booking.id,
                reference: booking.booking_reference,
                guestName: booking.guest_name,
                email: booking.email,
                phone: booking.phone,
                resortName: booking.resort_name,
                checkIn: booking.check_in
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to validate booking' });
    }
});

// Initialize food orders table
async function initFoodOrdersTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS food_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            booking_id TEXT NOT NULL,
            resort_name TEXT NOT NULL,
            guest_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            delivery_time TEXT,
            items TEXT NOT NULL,
            subtotal INTEGER NOT NULL,
            delivery_fee INTEGER NOT NULL,
            total INTEGER NOT NULL,
            status TEXT DEFAULT 'pending_payment',
            payment_method TEXT,
            transaction_id TEXT,
            payment_id TEXT,
            order_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            confirmed_at DATETIME,
            cancelled_at DATETIME
        )
    `);
}

// Create food order (pending payment)
app.post('/api/food-orders', async (req, res) => {
    try {
        const { bookingId, phoneNumber, customerEmail, deliveryTime, items, subtotal, deliveryFee, total } = req.body;
        
        // Validate booking ID first
        const booking = await db.get(`
            SELECT b.id, b.booking_reference, b.guest_name, b.check_in, r.name as resort_name
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE (b.booking_reference = ? OR b.id = ?) AND b.payment_status = 'paid'
        `, [bookingId, bookingId]);
        
        if (!booking) {
            return res.status(400).json({ 
                error: 'Invalid booking ID or booking not confirmed' 
            });
        }
        
        // Allow food orders for any future check-in date
        const now = new Date();
        const checkInDate = new Date(booking.check_in);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        
        // Only block orders for past check-in dates
        if (checkInDate.getTime() < today.getTime()) {
            return res.status(400).json({ 
                error: 'Cannot order food for past check-in dates' 
            });
        }
        
        // If check-in is today, check if it's past 10 PM
        if (checkInDate.getTime() === today.getTime()) {
            const checkIn10PM = new Date(checkInDate);
            checkIn10PM.setHours(22, 0, 0, 0);
            
            if (now > checkIn10PM) {
                return res.status(400).json({ 
                    error: 'Food orders are only accepted until 10 PM on the check-in date' 
                });
            }
        }
        
        // Validate delivery time is within allowed slots (until 10 PM on check-in date)
        const deliveryDateTime = new Date(deliveryTime);
        const checkIn10PM = new Date(checkInDate);
        checkIn10PM.setHours(22, 0, 0, 0);
        
        if (deliveryDateTime > checkIn10PM) {
            return res.status(400).json({ 
                error: 'Delivery time must be before 10 PM on the check-in date' 
            });
        }
        
        const orderId = `FO${Date.now()}`;
        
        // Store order in database
        await db.run(`
            INSERT INTO food_orders (order_id, booking_id, resort_name, guest_name, phone_number, customer_email, delivery_time, items, subtotal, delivery_fee, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [orderId, bookingId, booking.resort_name, booking.guest_name, phoneNumber, customerEmail, deliveryTime, JSON.stringify(items), subtotal, deliveryFee, total, 'pending_payment']);
        
        console.log('Food order created:', { orderId, bookingId, total, checkInDate: booking.check_in });
        
        // Send Telegram notification for new food order
        try {
            const message = `🍽️ NEW FOOD ORDER CREATED!

📋 Order ID: ${orderId}
🏨 Resort: ${booking.resort_name}
👤 Guest: ${booking.guest_name}
📧 Email: ${customerEmail}
📱 Phone: ${phoneNumber}
📅 Delivery: ${new Date(deliveryTime).toLocaleString('en-IN')}
💰 Total: ₹${total.toLocaleString()}
⚠️ Status: Pending Payment

⏰ Ordered at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        // Publish food order created event
        try {
            await publishEvent('vizag.food', EVENTS.FOOD_ORDER_CREATED, {
                orderId: orderId,
                bookingId: bookingId,
                total: total
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.FOOD_ORDER_CREATED, 'vizag.food', {
                orderId: orderId,
                bookingId: bookingId
            });
            
            // Notify booking server directly
            const bookingServerUrl = 'http://localhost:3002/api/eventbridge-notify';
            await fetch(bookingServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'food.order.created',
                    source: 'vizag.food',
                    data: { orderId, bookingId, total }
                })
            }).catch(err => console.log('Booking server notification failed:', err.message));
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ 
            success: true, 
            message: 'Order created successfully',
            orderId
        });
    } catch (error) {
        console.error('Food order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Submit food order payment for verification
app.post('/api/food-orders/:orderId/payment', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { transactionId, paymentId, paymentMethod } = req.body;
        
        // Update order with payment info
        await db.run(`
            UPDATE food_orders SET transaction_id = ?, payment_id = ?, payment_method = ?, status = ?
            WHERE order_id = ?
        `, [transactionId, paymentId, paymentMethod, 'pending_verification', orderId]);
        
        console.log('Food order payment submitted for verification:', {
            orderId,
            transactionId,
            paymentId,
            paymentMethod,
            status: 'pending_verification',
            submittedAt: new Date()
        });
        
        // Get order details for notification
        const order = await db.get('SELECT * FROM food_orders WHERE order_id = ?', [orderId]);
        
        // Send Telegram notification for manual verification
        try {
            const message = `🍽️ FOOD ORDER PAYMENT SUBMITTED!

📋 Order ID: ${orderId}
🏨 Resort: ${order ? order.resort_name : 'N/A'}
👤 Guest: ${order ? order.guest_name : 'N/A'}
💰 Amount: ₹${order ? order.total.toLocaleString() : 'N/A'}
💳 Payment Method: ${paymentMethod.toUpperCase()}
${transactionId ? `🔢 UTR ID: ${transactionId}` : ''}
${paymentId ? `🔢 Payment ID: ${paymentId}` : ''}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 Please verify and confirm in booking management panel`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        // Publish food payment updated event
        try {
            await publishEvent('vizag.food', EVENTS.FOOD_ORDER_UPDATED, {
                orderId: orderId,
                paymentMethod: paymentMethod,
                status: 'pending_verification'
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.FOOD_ORDER_UPDATED, 'vizag.food', {
                orderId: orderId,
                status: 'pending_verification'
            });
            
            // Notify booking server directly
            const bookingServerUrl = 'http://localhost:3002/api/eventbridge-notify';
            await fetch(bookingServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'food.order.updated',
                    source: 'vizag.food',
                    data: { orderId, status: 'pending_verification' }
                })
            }).catch(err => console.log('Booking server notification failed:', err.message));
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ 
            success: true, 
            message: 'Payment submitted for verification'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit payment' });
    }
});

// Confirm food order payment (admin endpoint)
app.post('/api/food-orders/:orderId/confirm', async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await db.get('SELECT * FROM food_orders WHERE order_id = ?', [orderId]);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Update order status
        await db.run('UPDATE food_orders SET status = ?, confirmed_at = datetime("now") WHERE order_id = ?', ['confirmed', orderId]);
        
        // Generate and send invoice
        try {
            const invoiceData = {
                orderId: order.order_id,
                bookingId: order.booking_id,
                resortName: order.resort_name,
                customerName: order.guest_name,
                email: order.customer_email,
                phone: order.phone_number,
                orderDate: order.order_time,
                items: JSON.parse(order.items),
                subtotal: order.subtotal,
                deliveryFee: order.delivery_fee,
                total: order.total,
                paymentMethod: order.payment_method,
                transactionId: order.transaction_id || order.payment_id
            };
            
            await sendInvoiceEmail(invoiceData, 'food');
            console.log(`Food order invoice sent for ${orderId}`);
            
            // Backup invoice to S3
            try {
                await backupInvoiceToS3(invoiceData, 'food');
                console.log(`Food order invoice backed up to S3 for ${orderId}`);
            } catch (s3Error) {
                console.error('S3 backup failed:', s3Error);
            }
        } catch (emailError) {
            console.error('Failed to send food order invoice:', emailError);
        }
        
        // Publish food order confirmed event
        try {
            await publishEvent('vizag.food', EVENTS.FOOD_ORDER_UPDATED, {
                orderId: orderId,
                status: 'confirmed'
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ 
            success: true, 
            message: 'Food order confirmed and invoice sent'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to confirm order' });
    }
});

// Cancel food order
app.post('/api/food-orders/:orderId/cancel', async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await db.get('SELECT * FROM food_orders WHERE order_id = ?', [orderId]);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        if (order.status === 'confirmed') {
            return res.status(400).json({ error: 'Cannot cancel confirmed order' });
        }
        
        // Update order status
        await db.run('UPDATE food_orders SET status = ?, cancelled_at = datetime("now") WHERE order_id = ?', ['cancelled', orderId]);
        
        // Send cancellation email to customer
        try {
            const cancellationData = {
                orderId: order.order_id,
                bookingId: order.booking_id,
                resortName: order.resort_name,
                customerName: order.guest_name,
                email: order.customer_email,
                phone: order.phone_number,
                orderDate: order.order_time,
                items: JSON.parse(order.items),
                subtotal: order.subtotal,
                deliveryFee: order.delivery_fee,
                total: order.total,
                cancelledAt: new Date()
            };
            
            await sendInvoiceEmail(cancellationData, 'food_cancelled');
            console.log(`Food order cancellation email sent for ${orderId}`);
        } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
        }
        
        // Send Telegram notification
        try {
            const message = `❌ FOOD ORDER CANCELLED!

📋 Order ID: ${orderId}
🏨 Resort: ${order.resort_name}
👤 Guest: ${order.guest_name}
💰 Amount: ₹${order.total.toLocaleString()}
⏰ Cancelled at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        res.json({ 
            success: true, 
            message: 'Food order cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

// Get food orders (admin endpoint)
app.get('/api/food-orders', async (req, res) => {
    try {
        const orders = await db.all(`
            SELECT *, 
                   order_id as orderId,
                   booking_id as bookingId,
                   resort_name as resortName,
                   guest_name as guestName,
                   phone_number as phoneNumber,
                   customer_email as customerEmail,
                   delivery_time as deliveryTime,
                   delivery_fee as deliveryFee,
                   order_time as orderTime,
                   payment_method as paymentMethod,
                   transaction_id as transactionId,
                   payment_id as paymentId
            FROM food_orders 
            ORDER BY order_time DESC
        `);
        
        // Parse items JSON for each order
        orders.forEach(order => {
            if (order.items) {
                order.items = JSON.parse(order.items);
            }
        });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch food orders' });
    }
});

// Clear all food orders (admin endpoint)
app.delete('/api/food-orders/clear-all', async (req, res) => {
    try {
        const result = await db.run('DELETE FROM food_orders');
        
        // Send Telegram notification
        try {
            const message = `🗑️ ALL FOOD ORDERS CLEARED!

📊 Orders deleted: ${result.changes}
⏰ Cleared at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
👤 Action: Booking Management Panel`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        res.json({ 
            success: true, 
            message: `Cleared ${result.changes} food orders`,
            deletedCount: result.changes
        });
    } catch (error) {
        console.error('Clear food orders error:', error);
        res.status(500).json({ error: 'Failed to clear food orders' });
    }
});

// Initialize food items table
async function initFoodItemsTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS food_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Insert default items if table is empty
    const count = await db.get('SELECT COUNT(*) as count FROM food_items');
    if (count.count === 0) {
        const defaultItems = [
            { name: "Chicken Biryani", description: "Aromatic basmati rice with tender chicken pieces", price: 250, image: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400" },
            { name: "Paneer Butter Masala", description: "Creamy tomato-based curry with soft paneer cubes", price: 180, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400" },
            { name: "Fish Curry", description: "Fresh fish cooked in coconut-based spicy curry", price: 220, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400" },
            { name: "Veg Fried Rice", description: "Wok-tossed rice with fresh vegetables", price: 150, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400" },
            { name: "Mutton Curry", description: "Tender mutton pieces in rich, spicy gravy", price: 300, image: "https://images.unsplash.com/photo-1574653853027-5d3ac9b9e7c7?w=400" },
            { name: "Dal Tadka", description: "Yellow lentils tempered with cumin and spices", price: 120, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" },
            { name: "Chicken Tikka", description: "Grilled chicken marinated in yogurt and spices", price: 200, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400" },
            { name: "Naan Bread", description: "Soft, fluffy Indian bread baked in tandoor", price: 40, image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=400" }
        ];
        
        for (const item of defaultItems) {
            await db.run('INSERT INTO food_items (name, description, price, image) VALUES (?, ?, ?, ?)', 
                [item.name, item.description, item.price, item.image]);
        }
    }
}

// Initialize travel packages table
async function initTravelPackagesTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS travel_packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Insert default packages if table is empty
    const count = await db.get('SELECT COUNT(*) as count FROM travel_packages');
    if (count.count === 0) {
        const defaultPackages = [
            { name: "Araku Valley Day Trip", description: "Scenic hill station with coffee plantations and tribal culture", price: 2500, image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400" },
            { name: "Borra Caves Adventure", description: "Explore million-year-old limestone caves with stunning formations", price: 1800, image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400" },
            { name: "Vizag City Tour", description: "Complete city tour covering beaches, temples, and local attractions", price: 1500, image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400" },
            { name: "Lambasingi Hill Station", description: "Kashmir of Andhra Pradesh with misty hills and cool climate", price: 3000, image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400" }
        ];
        
        for (const pkg of defaultPackages) {
            await db.run('INSERT INTO travel_packages (name, description, price, image) VALUES (?, ?, ?, ?)', 
                [pkg.name, pkg.description, pkg.price, pkg.image]);
        }
    }
}

app.get('/api/food-items', async (req, res) => {
    try {
        const foodItems = await db.all('SELECT * FROM food_items ORDER BY id');
        res.json(foodItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch food items' });
    }
});

app.post('/api/food-items', async (req, res) => {
    try {
        const { name, description, price, image } = req.body;
        const result = await db.run(
            'INSERT INTO food_items (name, description, price, image) VALUES (?, ?, ?, ?)',
            [name, description, parseInt(price), image]
        );
        
        const newItem = { id: result.lastID, name, description, price: parseInt(price), image };
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.food', EVENTS.FOOD_ITEM_CREATED, {
                itemId: newItem.id,
                name: name
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.FOOD_ITEM_CREATED, 'vizag.food', {
                itemId: newItem.id,
                name: name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, item: newItem });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add food item' });
    }
});

app.put('/api/food-items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, price, image } = req.body;
        
        const result = await db.run(
            'UPDATE food_items SET name = ?, description = ?, price = ?, image = ? WHERE id = ?',
            [name, description, parseInt(price), image, id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Food item not found' });
        }
        
        const updatedItem = { id, name, description, price: parseInt(price), image };
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.food', EVENTS.FOOD_ITEM_UPDATED, {
                itemId: id,
                name: name
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.FOOD_ITEM_UPDATED, 'vizag.food', {
                itemId: id,
                name: name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, item: updatedItem });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update food item' });
    }
});

app.delete('/api/food-items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const item = await db.get('SELECT name FROM food_items WHERE id = ?', [id]);
        if (!item) {
            return res.status(404).json({ error: 'Food item not found' });
        }
        
        await db.run('DELETE FROM food_items WHERE id = ?', [id]);
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.food', EVENTS.FOOD_ITEM_DELETED, {
                itemId: id,
                name: item.name
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.FOOD_ITEM_DELETED, 'vizag.food', {
                itemId: id,
                name: item.name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, message: 'Food item deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete food item' });
    }
});

// Travel packages CRUD endpoints
app.get('/api/travel-packages', async (req, res) => {
    try {
        const packages = await db.all('SELECT * FROM travel_packages ORDER BY id');
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch travel packages' });
    }
});

app.post('/api/travel-packages', async (req, res) => {
    try {
        const { name, description, price, image } = req.body;
        const result = await db.run(
            'INSERT INTO travel_packages (name, description, price, image) VALUES (?, ?, ?, ?)',
            [name, description, parseInt(price), image]
        );
        
        const newPackage = { id: result.lastID, name, description, price: parseInt(price), image };
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.travel', EVENTS.TRAVEL_PACKAGE_CREATED, {
                packageId: newPackage.id,
                name: name
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.TRAVEL_PACKAGE_CREATED, 'vizag.travel', {
                packageId: newPackage.id,
                name: name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, package: newPackage });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add travel package' });
    }
});

app.put('/api/travel-packages/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, price, image } = req.body;
        
        const result = await db.run(
            'UPDATE travel_packages SET name = ?, description = ?, price = ?, image = ? WHERE id = ?',
            [name, description, parseInt(price), image, id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Travel package not found' });
        }
        
        const updatedPackage = { id, name, description, price: parseInt(price), image };
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.travel', EVENTS.TRAVEL_PACKAGE_UPDATED, {
                packageId: id,
                name: name
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.TRAVEL_PACKAGE_UPDATED, 'vizag.travel', {
                packageId: id,
                name: name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, package: updatedPackage });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update travel package' });
    }
});

app.delete('/api/travel-packages/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const pkg = await db.get('SELECT name FROM travel_packages WHERE id = ?', [id]);
        if (!pkg) {
            return res.status(404).json({ error: 'Travel package not found' });
        }
        
        await db.run('DELETE FROM travel_packages WHERE id = ?', [id]);
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.travel', EVENTS.TRAVEL_PACKAGE_DELETED, {
                packageId: id,
                name: pkg.name
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.TRAVEL_PACKAGE_DELETED, 'vizag.travel', {
                packageId: id,
                name: pkg.name
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, message: 'Travel package deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete travel package' });
    }
});

// Resort Owner Dashboard routes
let bcrypt, jwt;
try {
    bcrypt = require('bcrypt');
    jwt = require('jsonwebtoken');
} catch (error) {
    console.log('⚠️ bcrypt or jsonwebtoken not installed, owner features disabled');
}
const JWT_SECRET = process.env.JWT_SECRET || 'vizag-resort-owner-secret';

// Serve owner dashboard static files
app.use('/owner-dashboard', express.static('owner-public'));

app.get('/owner-dashboard', (req, res) => {
    res.sendFile(__dirname + '/owner-public/login.html');
});

// Owner login
app.post('/api/owner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const owner = await db.get('SELECT * FROM resort_owners WHERE email = ?', [email]);
        if (!owner) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, owner.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ ownerId: owner.id, email: owner.email }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            success: true, 
            token, 
            owner: { 
                id: owner.id, 
                name: owner.name, 
                email: owner.email,
                resortIds: owner.resort_ids.split(',').map(id => parseInt(id))
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify owner token
function verifyOwnerToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.owner = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Get owner's resorts
app.get('/api/owner/resorts', verifyOwnerToken, async (req, res) => {
    try {
        const owner = await db.get('SELECT resort_ids FROM resort_owners WHERE id = ?', [req.owner.ownerId]);
        const resortIds = owner.resort_ids.split(',').map(id => parseInt(id));
        
        const resorts = await db.all(
            `SELECT * FROM resorts WHERE id IN (${resortIds.map(() => '?').join(',')})`,
            resortIds
        );
        
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

// Get blocked dates for owner's resorts
app.get('/api/owner/blocked-dates', verifyOwnerToken, async (req, res) => {
    try {
        const owner = await db.get('SELECT resort_ids FROM resort_owners WHERE id = ?', [req.owner.ownerId]);
        const resortIds = owner.resort_ids.split(',').map(id => parseInt(id));
        
        const blockedDates = await db.all(
            `SELECT ra.*, r.name as resort_name 
             FROM resort_availability ra 
             JOIN resorts r ON ra.resort_id = r.id 
             WHERE ra.resort_id IN (${resortIds.map(() => '?').join(',')}) 
             ORDER BY ra.blocked_date DESC`,
            resortIds
        );
        
        res.json(blockedDates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blocked dates' });
    }
});

// Block date for resort
app.post('/api/owner/block-date', verifyOwnerToken, async (req, res) => {
    try {
        const { resortId, date, reason } = req.body;
        
        // Verify owner has access to this resort
        const owner = await db.get('SELECT resort_ids FROM resort_owners WHERE id = ?', [req.owner.ownerId]);
        const resortIds = owner.resort_ids.split(',').map(id => parseInt(id));
        
        if (!resortIds.includes(parseInt(resortId))) {
            return res.status(403).json({ error: 'Access denied to this resort' });
        }
        
        // Check if date is already blocked
        const existing = await db.get(
            'SELECT id FROM resort_availability WHERE resort_id = ? AND blocked_date = ?',
            [resortId, date]
        );
        
        if (existing) {
            return res.status(400).json({ error: 'Date is already blocked' });
        }
        
        // Block the date
        await db.run(
            'INSERT INTO resort_availability (resort_id, blocked_date, reason, created_by) VALUES (?, ?, ?, ?)',
            [resortId, date, reason, req.owner.ownerId]
        );
        
        // Get resort name for notification
        const resort = await db.get('SELECT name FROM resorts WHERE id = ?', [resortId]);
        
        // Send Telegram notification
        try {
            const message = `🚫 DATE BLOCKED BY OWNER!

🏨 Resort: ${resort.name}
📅 Date: ${new Date(date).toLocaleDateString('en-IN')}
📝 Reason: ${reason || 'No reason provided'}
👤 Blocked by: ${req.owner.email}
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.resort', EVENTS.RESORT_AVAILABILITY_UPDATED, {
                resortId: resortId,
                date: date,
                action: 'blocked',
                reason: reason
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.RESORT_AVAILABILITY_UPDATED, 'vizag.resort', {
                resortId: resortId,
                action: 'blocked'
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, message: 'Date blocked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to block date' });
    }
});

// Unblock date for resort
app.delete('/api/owner/unblock-date/:id', verifyOwnerToken, async (req, res) => {
    try {
        const blockId = req.params.id;
        
        // Get block details and verify ownership
        const block = await db.get(
            `SELECT ra.*, r.name as resort_name 
             FROM resort_availability ra 
             JOIN resorts r ON ra.resort_id = r.id 
             WHERE ra.id = ?`,
            [blockId]
        );
        
        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        // Verify owner has access to this resort
        const owner = await db.get('SELECT resort_ids FROM resort_owners WHERE id = ?', [req.owner.ownerId]);
        const resortIds = owner.resort_ids.split(',').map(id => parseInt(id));
        
        if (!resortIds.includes(block.resort_id)) {
            return res.status(403).json({ error: 'Access denied to this resort' });
        }
        
        // Remove the block
        await db.run('DELETE FROM resort_availability WHERE id = ?', [blockId]);
        
        // Send Telegram notification
        try {
            const message = `✅ DATE UNBLOCKED BY OWNER!

🏨 Resort: ${block.resort_name}
📅 Date: ${new Date(block.blocked_date).toLocaleDateString('en-IN')}
👤 Unblocked by: ${req.owner.email}
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        // Publish EventBridge event
        try {
            await publishEvent('vizag.resort', EVENTS.RESORT_AVAILABILITY_UPDATED, {
                resortId: block.resort_id,
                date: block.blocked_date,
                action: 'unblocked'
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.RESORT_AVAILABILITY_UPDATED, 'vizag.resort', {
                resortId: block.resort_id,
                action: 'unblocked'
            });
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ success: true, message: 'Date unblocked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unblock date' });
    }
});

// Get bookings for owner's resorts
app.get('/api/owner/bookings', verifyOwnerToken, async (req, res) => {
    try {
        const owner = await db.get('SELECT resort_ids FROM resort_owners WHERE id = ?', [req.owner.ownerId]);
        const resortIds = owner.resort_ids.split(',').map(id => parseInt(id));
        
        const bookings = await db.all(
            `SELECT b.*, r.name as resort_name,
                    COALESCE(b.booking_reference, 'RB' || SUBSTR('000000' || b.id, -6)) as booking_ref
             FROM bookings b 
             JOIN resorts r ON b.resort_id = r.id 
             WHERE b.resort_id IN (${resortIds.map(() => '?').join(',')}) 
             ORDER BY b.booking_date DESC`,
            resortIds
        );
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Travel booking endpoints
app.post('/api/travel-bookings', async (req, res) => {
    try {
        const { customer_name, phone, email, travel_date, pickup_location, packages, total_amount } = req.body;
        
        if (!customer_name || !phone || !email || !travel_date || !pickup_location || !packages || !total_amount) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const booking_reference = `TR${Date.now()}`;
        
        // Create travel bookings table if it doesn't exist
        await db.exec(`
            CREATE TABLE IF NOT EXISTS travel_bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_reference TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                travel_date TEXT NOT NULL,
                pickup_location TEXT NOT NULL,
                packages TEXT NOT NULL,
                total_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'pending_payment',
                payment_method TEXT,
                transaction_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert travel booking
        const result = await db.run(`
            INSERT INTO travel_bookings (booking_reference, customer_name, phone, email, travel_date, pickup_location, packages, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [booking_reference, customer_name, phone, email, travel_date, pickup_location, JSON.stringify(packages), total_amount]);
        
        // Store the booking ID for payment submission
        const bookingId = result.lastID;
        
        // Send Telegram notification
        try {
            const packageNames = packages.map(p => `${p.name} x${p.quantity}`).join(', ');
            const message = `🚗 NEW TRAVEL BOOKING CREATED!

📋 Booking ID: ${booking_reference}
👤 Customer: ${customer_name}
📧 Email: ${email}
📱 Phone: ${phone}
📅 Travel Date: ${new Date(travel_date).toLocaleDateString('en-IN')}
📍 Pickup: ${pickup_location}
🎯 Packages: ${packageNames}
💰 Amount: ₹${total_amount.toLocaleString()}
⚠️ Status: Pending Payment

⏰ Booked at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 Check booking management panel for updates`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('Telegram notification failed:', telegramError);
        }
        
        // Publish travel booking created event
        try {
            await publishEvent('vizag.travel', EVENTS.TRAVEL_BOOKING_CREATED, {
                bookingId: result.lastID,
                bookingReference: booking_reference,
                customerName: customer_name,
                totalAmount: total_amount
            });
            
            // Notify EventBridge listener
            eventBridgeListener.handleEvent(EVENTS.TRAVEL_BOOKING_CREATED, 'vizag.travel', {
                bookingId: result.lastID,
                bookingReference: booking_reference
            });
            
            // Real-time sync via EventBridge only
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ 
            success: true, 
            booking_reference,
            booking_id: bookingId,
            message: 'Travel booking created successfully'
        });
    } catch (error) {
        console.error('Travel booking error:', error);
        res.status(500).json({ error: 'Failed to create travel booking' });
    }
});

// Get travel bookings (admin endpoint)
app.get('/api/travel-bookings', async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT * FROM travel_bookings 
            ORDER BY created_at DESC
        `);
        
        // Parse packages JSON for each booking
        bookings.forEach(booking => {
            if (booking.packages) {
                booking.packages = JSON.parse(booking.packages);
            }
        });
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch travel bookings' });
    }
});

// Submit travel booking payment for verification
app.post('/api/travel-bookings/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, transaction_id } = req.body;
        
        // Update booking with payment info
        await db.run(`
            UPDATE travel_bookings SET payment_method = ?, transaction_id = ?, status = ?
            WHERE id = ?
        `, [payment_method, transaction_id, 'pending_verification', id]);
        
        // Get booking details for notification
        const booking = await db.get('SELECT * FROM travel_bookings WHERE id = ?', [id]);
        
        if (booking) {
            // Send Telegram notification
            try {
                const packageNames = JSON.parse(booking.packages).map(p => `${p.name} x${p.quantity}`).join(', ');
                const message = `🚗 TRAVEL PAYMENT SUBMITTED!

📋 Booking ID: ${booking.booking_reference}
👤 Customer: ${booking.customer_name}
📱 Phone: ${booking.phone}
📅 Travel Date: ${new Date(booking.travel_date).toLocaleDateString('en-IN')}
📍 Pickup: ${booking.pickup_location}
🎯 Packages: ${packageNames}
💰 Amount: ₹${booking.total_amount.toLocaleString()}
💳 Payment Method: ${payment_method.toUpperCase()}
${transaction_id ? `🔢 UTR ID: ${transaction_id}` : ''}
⚠️ Status: Pending Verification

⏰ Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 Please verify and confirm in booking management panel`;
                
                await sendTelegramNotification(message);
            } catch (telegramError) {
                console.error('Telegram notification failed:', telegramError);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Travel booking payment submitted for verification'
        });
    } catch (error) {
        console.error('Travel payment submission error:', error);
        res.status(500).json({ error: 'Failed to submit payment' });
    }
});

// Confirm travel booking payment
app.post('/api/travel-bookings/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await db.get('SELECT * FROM travel_bookings WHERE id = ?', [id]);
        
        if (!booking) {
            return res.status(404).json({ error: 'Travel booking not found' });
        }
        
        // Update booking status
        await db.run('UPDATE travel_bookings SET status = ? WHERE id = ?', ['confirmed', id]);
        
        // Send confirmation email
        try {
            const confirmationData = {
                bookingReference: booking.booking_reference,
                customerName: booking.customer_name,
                email: booking.email,
                phone: booking.phone,
                travelDate: booking.travel_date,
                pickupLocation: booking.pickup_location,
                packages: JSON.parse(booking.packages),
                totalAmount: booking.total_amount,
                confirmedAt: new Date()
            };
            
            await sendInvoiceEmail(confirmationData, 'travel');
            console.log(`Travel booking confirmation sent for ${booking.booking_reference}`);
        } catch (emailError) {
            console.error('Failed to send travel confirmation:', emailError);
        }
        
        // Publish travel booking confirmed event
        try {
            await publishEvent('vizag.travel', EVENTS.TRAVEL_BOOKING_UPDATED, {
                bookingId: id,
                bookingReference: booking.booking_reference,
                status: 'confirmed'
            });
            
            // Real-time sync via EventBridge only
        } catch (eventError) {
            console.error('EventBridge publish failed:', eventError);
        }
        
        res.json({ 
            success: true, 
            message: 'Travel booking confirmed'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to confirm travel booking' });
    }
});

// Initialize and start server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Resort Booking Server running on http://0.0.0.0:${PORT}`);
        console.log(`🍽️ My Food Service available at http://0.0.0.0:${PORT}/food`);
        console.log(`👤 Owner Dashboard available at http://0.0.0.0:${PORT}/owner-dashboard`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
});