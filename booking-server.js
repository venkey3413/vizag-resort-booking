const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { backupDatabase, generateInvoice, scheduleBackups } = require('./backup-service');
const { sendInvoiceEmail } = require('./email-service');
const { sendTelegramNotification, formatBookingNotification } = require('./telegram-service');
const redisPubSub = require('./redis-pubsub');
const fetch = require('node-fetch');
const { checkAvailability } = require('./availability-service');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Cache-busting headers
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static('bookings-public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/bookings-public/index.html');
});

// Real-time Redis pub/sub listener endpoint
app.get('/api/events', (req, res) => {
    const clientId = `booking-${Date.now()}-${Math.random()}`;
    redisPubSub.subscribe(clientId, res);
});

// Availability check endpoint
app.post('/api/check-availability', async (req, res) => {
    try {
        const { resortId, checkIn, checkOut } = req.body;
        const result = await checkAvailability(resortId, checkIn, checkOut);
        
        if (result.available) {
            res.json({ available: true });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

// Payment proof endpoint
app.post('/api/payment-proofs', async (req, res) => {
    try {
        const { bookingId, transactionId } = req.body;
        
        await db.run(
            'INSERT INTO payment_proofs (booking_id, transaction_id, created_at) VALUES (?, ?, datetime("now"))',
            [bookingId, transactionId]
        );
        
        res.json({ message: 'Payment proof stored successfully' });
    } catch (error) {
        console.error('Payment proof storage error:', error);
        res.status(500).json({ error: 'Failed to store payment proof' });
    }
});





let db;

async function initDB() {
    db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Add payment_status column if it doesn't exist
    try {
        await db.run('ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT "pending"');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add day_type column to coupons if it doesn't exist
    try {
        await db.run('ALTER TABLE coupons ADD COLUMN day_type TEXT DEFAULT "all"');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add resort_id column to coupons if it doesn't exist
    try {
        await db.run('ALTER TABLE coupons ADD COLUMN resort_id INTEGER');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Create resorts table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resorts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            image TEXT,
            gallery TEXT,
            videos TEXT,
            map_link TEXT,
            amenities TEXT,
            note TEXT,
            max_guests INTEGER,
            sort_order INTEGER DEFAULT 0,
            available INTEGER DEFAULT 1
        )
    `);
    
    // Create coupons table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            discount INTEGER NOT NULL,
            day_type TEXT DEFAULT 'all',
            resort_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create resort blocks table
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
    
    // Create dynamic pricing table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS dynamic_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resort_id INTEGER NOT NULL,
            day_type TEXT NOT NULL,
            price INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (resort_id) REFERENCES resorts (id)
        )
    `);
    
    // Create resort owners table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resort_owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password TEXT NOT NULL,
            resort_ids TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Add phone column if it doesn't exist
    try {
        await db.run('ALTER TABLE resort_owners ADD COLUMN phone TEXT');
    } catch (error) {
        // Column already exists, ignore error
    }
    
    // Add sample dynamic pricing if none exists
    const pricingCount = await db.get('SELECT COUNT(*) as count FROM dynamic_pricing');
    if (pricingCount.count === 0) {
        const resorts = await db.all('SELECT id, price FROM resorts LIMIT 3');
        for (const resort of resorts) {
            // Add weekday pricing (20% less than base)
            await db.run(
                'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                [resort.id, 'weekday', Math.round(resort.price * 0.8)]
            );
            // Add weekend pricing (30% more than base)
            await db.run(
                'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                [resort.id, 'weekend', Math.round(resort.price * 1.3)]
            );
        }
        console.log('✅ Sample dynamic pricing added for', resorts.length, 'resorts');
    }

}

// Booking API Routes - Admin only, no public access
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.status != 'cancelled'
            ORDER BY b.booking_date DESC
        `);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.put('/api/bookings/:id/payment', async (req, res) => {
    try {
        const id = req.params.id;
        const { payment_status } = req.body;
        
        // Get booking details for invoice
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [id]);
        
        await db.run(
            'UPDATE bookings SET payment_status = ? WHERE id = ?',
            [payment_status, id]
        );
        
        // Generate invoice and backup database when marked as paid
        if (payment_status === 'paid') {
            console.log(`💰 Payment marked as paid for booking ${id}, processing...`);
            try {
                console.log('📄 Generating invoice...');
                const invoice = await generateInvoice(booking);
                console.log('💾 Creating backup...');
                await backupDatabase();
                console.log(`✅ Invoice generated and backup created for booking ${id}`);
            } catch (error) {
                console.error('❌ Invoice/Backup error:', error);
            }
            
            // Publish availability update via Redis
            try {
                await redisPubSub.publish('resort-events', {
                    type: 'resort.availability.updated',
                    resortId: booking.resort_id,
                    date: booking.check_in,
                    action: 'booking_confirmed'
                });
            } catch (eventError) {
                console.error('Redis publish failed:', eventError);
            }
        }
        
        // Publish payment updated event via Redis
        try {
            await redisPubSub.publish('booking-events', {
                type: 'payment.updated',
                bookingId: id,
                paymentStatus: payment_status,
                guestName: booking.guest_name,
                resortName: booking.resort_name
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.post('/api/bookings/:id/send-email', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Get booking details
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [id]);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        if (booking.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Booking must be marked as paid first' });
        }
        
        // Send email
        const emailSent = await sendInvoiceEmail(booking);
        
        if (emailSent) {
            res.json({ message: 'Email sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (error) {
        console.error('Manual email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.run('DELETE FROM bookings WHERE id = ?', [id]);
        // Publish booking deleted event via Redis
        try {
            await redisPubSub.publish('booking-events', {
                type: 'booking.deleted',
                bookingId: id,
                status: 'deleted'
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

app.post('/api/test-backup', async (req, res) => {
    try {
        console.log('🧪 Manual backup test triggered');
        const result = await backupDatabase();
        res.json({ message: 'Backup completed successfully', location: result });
    } catch (error) {
        console.error('Manual backup failed:', error);
        res.status(500).json({ error: 'Backup failed', details: error.message });
    }
});

// Endpoint to cancel booking with optional email
app.post('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { sendEmail } = req.body;
        
        // Get booking details before deletion
        const booking = await db.get(`
            SELECT b.*, r.name as resort_name 
            FROM bookings b 
            JOIN resorts r ON b.resort_id = r.id 
            WHERE b.id = ?
        `, [bookingId]);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Delete the booking
        await db.run('DELETE FROM bookings WHERE id = ?', [bookingId]);
        await db.run('DELETE FROM payment_proofs WHERE booking_id = ?', [bookingId]);
        
        // Send cancellation email if requested
        if (sendEmail) {
            try {
                const nodemailer = require('nodemailer');
                
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_APP_PASSWORD
                    }
                });
                
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: booking.email,
                    subject: 'Booking Cancellation - Vizag Resorts',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="Vizag Resort Booking" style="max-width: 150px; height: auto;">
                            </div>
                            <h2 style="color: #333;">Booking Cancellation</h2>
                            
                            <p>Dear ${booking.guest_name},</p>
                            
                            <p>We have cancelled your booking with ${booking.resort_name}.</p>
                            
                            <p><strong>Here are the details of your cancelled booking:</strong></p>
                            
                            <p><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</p>
                            <p><strong>Guest Name:</strong> ${booking.guest_name}</p>
                            <p><strong>Check-in Date:</strong> ${new Date(booking.check_in).toLocaleDateString()}</p>
                            <p><strong>Check-out Date:</strong> ${new Date(booking.check_out).toLocaleDateString()}</p>
                            <p><strong>Resort Name:</strong> ${booking.resort_name}</p>
                            
                            <p><strong>As per our cancellation policy:</strong></p>
                            <p>Full refund will be processed</p>
                            
                            <p>Refund (if applicable) will be processed within 1-2 business days for UPI and 3-5 days for card to your original payment method.</p>
                            
                            <p>If you wish to reschedule or need any assistance, please contact us at vizagresortbooking@gmail.com</p>
                            
                            <p>We'd be delighted to welcome you again in the future.</p>
                            
                            <p>Thank you for considering vizagresortbooking.in We hope to host you on your next trip.</p>
                            
                            <p>Warm regards,<br>
                            <a href="https://vizagresortbooking.in/" style="color: #667eea;">https://vizagresortbooking.in/</a></p>
                        </div>
                    `
                };
                
                await transporter.sendMail(mailOptions);
                console.log('Cancellation email sent to:', booking.email);
            } catch (emailError) {
                console.error('Failed to send cancellation email:', emailError);
            }
        }
        
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Coupon management endpoints
app.get('/api/coupons', async (req, res) => {
    try {
        const { checkIn } = req.query;
        let coupons;
        
        if (checkIn) {
            const checkInDate = new Date(checkIn);
            const dayOfWeek = checkInDate.getDay();
            // Mon-Thu = weekdays (1,2,3,4), Fri = friday (5), Sat-Sun = weekends (6,0)
            let dayType = 'weekday';
            if (dayOfWeek === 5) {
                dayType = 'friday';
            } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayType = 'weekend';
            }
            
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

app.post('/api/coupons', async (req, res) => {
    try {
        const { code, type, discount, day_type, resort_id } = req.body;
        
        if (!code || !type || !discount) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        await db.run('INSERT INTO coupons (code, type, discount, day_type, resort_id) VALUES (?, ?, ?, ?, ?)', 
            [code, type, discount, day_type || 'all', resort_id || null]);
        res.json({ message: 'Coupon created successfully' });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            res.status(400).json({ error: 'Coupon code already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create coupon' });
        }
    }
});

app.delete('/api/coupons/:code', async (req, res) => {
    try {
        await db.run('DELETE FROM coupons WHERE code = ?', [req.params.code]);
        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
});

// Resort management endpoints
app.get('/api/resorts', async (req, res) => {
    try {
        const resorts = await db.all('SELECT * FROM resorts ORDER BY sort_order ASC, id ASC');
        
        // Add dynamic pricing to each resort
        for (let resort of resorts) {
            const pricing = await db.all(
                'SELECT day_type, price FROM dynamic_pricing WHERE resort_id = ?',
                [resort.id]
            );
            resort.dynamic_pricing = pricing;
        }
        
        res.json(resorts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const { name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order, dynamic_pricing, createOwner, ownerName, ownerEmail, ownerPassword } = req.body;
        
        const result = await db.run(`
            INSERT INTO resorts (name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order || 0]);
        
        const resortId = result.lastID;
        
        // Add dynamic pricing if provided
        if (dynamic_pricing && dynamic_pricing.length > 0) {
            for (const item of dynamic_pricing) {
                await db.run(
                    'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                    [resortId, item.day_type, item.price]
                );
            }
        }
        
        // Create owner account if requested
        if (createOwner && ownerName && ownerEmail && ownerPassword) {
            try {
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash(ownerPassword, 10);
                
                // Check if input is phone or email and normalize phone
                let email = ownerEmail;
                let phone = null;
                
                if (/^[0-9]{10}$/.test(ownerEmail)) {
                    // 10 digit number, add +91
                    phone = '+91' + ownerEmail;
                    email = null;
                } else if (/^\+91[0-9]{10}$/.test(ownerEmail)) {
                    // Already has +91
                    phone = ownerEmail;
                    email = null;
                }
                
                // Use a dummy email if phone-only to avoid constraint issues
                const finalEmail = email || `phone_${phone.replace('+', '')}@dummy.local`;
                
                await db.run(
                    'INSERT INTO resort_owners (name, email, phone, password, resort_ids) VALUES (?, ?, ?, ?, ?)',
                    [ownerName, finalEmail, phone, hashedPassword, resortId.toString()]
                );
                
                // Send Telegram notification about new owner
                try {
                    const message = `🏨 NEW RESORT & OWNER CREATED!

🏖️ Resort: ${name}
👤 Owner: ${ownerName}
📧 Email: ${ownerEmail}
🆔 Resort ID: ${resortId}
⏰ Created: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

🔗 Owner can login at: https://vizagresortbooking.in/owner-dashboard`;
                    await sendTelegramNotification(message);
                } catch (telegramError) {
                    console.error('Telegram notification failed:', telegramError);
                }
            } catch (ownerError) {
                console.error('Failed to create owner account:', ownerError);
            }
        }
        
        // Publish resort added event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.added',
                resortId: resortId
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Resort added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const { name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order, dynamic_pricing, createOwner, ownerName, ownerEmail, ownerPassword, available } = req.body;
        const resortId = req.params.id;
        
        // Handle availability toggle separately
        if (available !== undefined) {
            await db.run('UPDATE resorts SET available = ? WHERE id = ?', [available ? 1 : 0, resortId]);
        } else {
            await db.run(`
                UPDATE resorts SET name = ?, location = ?, price = ?, description = ?, 
                image = ?, gallery = ?, videos = ?, map_link = ?, amenities = ?, note = ?, max_guests = ?, sort_order = ?
                WHERE id = ?
            `, [name, location, price, description, image, gallery, videos, map_link, amenities, note, max_guests, sort_order || 0, resortId]);
            
            // Update dynamic pricing only if not just toggling availability
            await db.run('DELETE FROM dynamic_pricing WHERE resort_id = ?', [resortId]);
            if (dynamic_pricing && dynamic_pricing.length > 0) {
                for (const item of dynamic_pricing) {
                    await db.run(
                        'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                        [resortId, item.day_type, item.price]
                    );
                }
            }
        }
        
        // Create owner account if requested
        if (createOwner && ownerName && ownerEmail && ownerPassword) {
            try {
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash(ownerPassword, 10);
                
                // Check if input is phone or email and normalize phone
                let email = ownerEmail;
                let phone = null;
                
                if (/^[0-9]{10}$/.test(ownerEmail)) {
                    // 10 digit number, add +91
                    phone = '+91' + ownerEmail;
                    email = null;
                } else if (/^\+91[0-9]{10}$/.test(ownerEmail)) {
                    // Already has +91
                    phone = ownerEmail;
                    email = null;
                }
                
                // Check if owner already exists for this resort
                const existingOwner = await db.get(
                    'SELECT id, resort_ids FROM resort_owners WHERE email = ? OR phone = ?',
                    [email, phone]
                );
                
                if (existingOwner) {
                    // Add resort to existing owner's list
                    const resortIds = existingOwner.resort_ids.split(',');
                    if (!resortIds.includes(resortId)) {
                        resortIds.push(resortId);
                        await db.run(
                            'UPDATE resort_owners SET resort_ids = ? WHERE id = ?',
                            [resortIds.join(','), existingOwner.id]
                        );
                    }
                } else {
                    // Create new owner
                    const finalEmail = email || `phone_${phone.replace('+', '')}@dummy.local`;
                    
                    await db.run(
                        'INSERT INTO resort_owners (name, email, phone, password, resort_ids) VALUES (?, ?, ?, ?, ?)',
                        [ownerName, finalEmail, phone, hashedPassword, resortId.toString()]
                    );
                }
                
                // Send Telegram notification
                try {
                    const message = `🏨 RESORT OWNER UPDATED!

🏖️ Resort: ${name}
👤 Owner: ${ownerName}
📧 Email: ${ownerEmail}
🆔 Resort ID: ${resortId}
⏰ Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

🔗 Owner can login at: https://vizagresortbooking.in/owner-dashboard`;
                    await sendTelegramNotification(message);
                } catch (telegramError) {
                    console.error('Telegram notification failed:', telegramError);
                }
            } catch (ownerError) {
                console.error('Failed to create/update owner account:', ownerError);
            }
        }
        
        // Publish resort updated event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.updated',
                resortId: resortId
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Resort updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

// Resort blocking endpoints
app.get('/api/resort-blocks', async (req, res) => {
    try {
        const blocks = await db.all(`
            SELECT rb.*, r.name as resort_name 
            FROM resort_blocks rb 
            JOIN resorts r ON rb.resort_id = r.id 
            ORDER BY rb.block_date DESC
        `);
        res.json(blocks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resort blocks' });
    }
});

app.post('/api/resort-blocks', async (req, res) => {
    try {
        const { resort_id, block_date, reason } = req.body;
        
        await db.run(
            'INSERT INTO resort_blocks (resort_id, block_date, reason) VALUES (?, ?, ?)',
            [resort_id, block_date, reason || 'Blocked by admin']
        );
        
        res.json({ message: 'Resort blocked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to block resort' });
    }
});

app.delete('/api/resort-blocks/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM resort_blocks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Resort block removed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove resort block' });
    }
});

// Dynamic pricing endpoints
app.get('/api/dynamic-pricing/:resortId', async (req, res) => {
    try {
        const pricing = await db.all(
            'SELECT * FROM dynamic_pricing WHERE resort_id = ? ORDER BY day_type',
            [req.params.resortId]
        );
        res.json(pricing);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dynamic pricing' });
    }
});

app.post('/api/dynamic-pricing', async (req, res) => {
    try {
        const { resort_id, pricing } = req.body;
        
        // Delete existing pricing for this resort
        await db.run('DELETE FROM dynamic_pricing WHERE resort_id = ?', [resort_id]);
        
        // Insert new pricing
        for (const item of pricing) {
            await db.run(
                'INSERT INTO dynamic_pricing (resort_id, day_type, price) VALUES (?, ?, ?)',
                [resort_id, item.day_type, item.price]
            );
        }
        
        res.json({ message: 'Dynamic pricing updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update dynamic pricing' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const resortId = req.params.id;
        
        await db.run('DELETE FROM resorts WHERE id = ?', [resortId]);
        await db.run('DELETE FROM dynamic_pricing WHERE resort_id = ?', [resortId]);
        
        // Publish resort deleted event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.deleted',
                resortId: resortId
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Resort deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete resort' });
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

// Food order management endpoints
app.get('/api/food-orders', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3000/api/food-orders');
        const orders = await response.json();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch food orders' });
    }
});

app.post('/api/food-orders/:orderId/confirm', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/food-orders/${req.params.orderId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to confirm food order' });
    }
});

app.post('/api/food-orders/:orderId/cancel', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/food-orders/${req.params.orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel food order' });
    }
});

// Clear all food orders endpoint
app.delete('/api/food-orders/clear-all', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3000/api/food-orders/clear-all', {
            method: 'DELETE'
        });
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear all food orders' });
    }
});

// Travel booking management endpoints
app.get('/api/travel-bookings', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3000/api/travel-bookings');
        const bookings = await response.json();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch travel bookings' });
    }
});

app.post('/api/travel-bookings/:id/confirm', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/travel-bookings/${req.params.id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to confirm travel booking' });
    }
});

app.post('/api/travel-bookings/:id/cancel', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/travel-bookings/${req.params.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel travel booking' });
    }
});

app.delete('/api/travel-bookings/:id', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/travel-bookings/${req.params.id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove travel booking' });
    }
});

// Resort ordering endpoint
app.post('/api/resorts/reorder', async (req, res) => {
    try {
        const { resortOrders } = req.body; // Array of {id, sort_order}
        
        for (const resort of resortOrders) {
            await db.run('UPDATE resorts SET sort_order = ? WHERE id = ?', [resort.sort_order, resort.id]);
        }
        
        // Publish resort order updated event via Redis
        try {
            await redisPubSub.publish('resort-events', {
                type: 'resort.order.updated',
                resortOrders: resortOrders
            });
        } catch (eventError) {
            console.error('Redis publish failed:', eventError);
        }
        
        res.json({ message: 'Resort order updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort order' });
    }
});

// Owner management endpoints
app.get('/api/owners', async (req, res) => {
    try {
        const owners = await db.all(`
            SELECT ro.id, ro.name, 
                   CASE WHEN ro.email LIKE 'phone_%@dummy.local' THEN '' ELSE COALESCE(ro.email, '') END as email, 
                   COALESCE(ro.phone, '') as phone, 
                   ro.resort_ids, ro.created_at, 
                   COALESCE(GROUP_CONCAT(r.name), '') as resort_names
            FROM resort_owners ro
            LEFT JOIN resorts r ON (',' || ro.resort_ids || ',' LIKE '%,' || r.id || ',%')
            GROUP BY ro.id, ro.name, ro.email, ro.phone, ro.resort_ids, ro.created_at
            ORDER BY ro.created_at DESC
        `);
        // Clean up the display for phone-only accounts
        const cleanedOwners = owners.map(owner => ({
            ...owner,
            email: owner.email.includes('@dummy.local') ? '' : owner.email
        }));
        
        res.json(cleanedOwners);
    } catch (error) {
        console.error('Owner fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch owners' });
    }
});

app.delete('/api/owners/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM resort_owners WHERE id = ?', [req.params.id]);
        res.json({ message: 'Owner deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete owner' });
    }
});









initDB().then(async () => {
    // Initialize availability service
    const availabilityService = require('./availability-service');
    await availabilityService.initDB();
    
    // Start automatic backups
    scheduleBackups();
    
    // Initialize Redis connection
    try {
        await redisPubSub.connect();
        console.log('✅ Redis pub/sub connected successfully');
    } catch (error) {
        console.error('❌ Redis connection failed:', error);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`📋 Booking Management running on http://0.0.0.0:${PORT}`);
    });
});