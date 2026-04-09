const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
let firebaseApp = null;

function initializeFirebase() {
    if (firebaseApp) return firebaseApp;

    try {
        // Option 1: Using service account JSON file
        const serviceAccount = require('./firebase-service-account.json');
        
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('✅ Firebase Admin SDK initialized');
        return firebaseApp;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        
        // Option 2: Using environment variables
        if (process.env.FIREBASE_PROJECT_ID && 
            process.env.FIREBASE_PRIVATE_KEY && 
            process.env.FIREBASE_CLIENT_EMAIL) {
            
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
                })
            });
            
            console.log('✅ Firebase Admin SDK initialized from env variables');
            return firebaseApp;
        }
        
        throw new Error('Firebase credentials not found');
    }
}

// Send notification to specific tokens
async function sendNotificationToTokens(tokens, title, body, data = {}) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
        throw new Error('No tokens provided');
    }

    // Initialize Firebase if not already done
    if (!firebaseApp) {
        initializeFirebase();
    }

    const message = {
        notification: {
            title: title,
            body: body
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            timestamp: Date.now().toString()
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'resort_bookings',
                color: '#1e5f74',
                icon: 'notification_icon'
            }
        },
        tokens: tokens
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log(`📱 Notification sent: ${response.successCount}/${tokens.length} successful`);
        
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses
        };
    } catch (error) {
        console.error('❌ Notification send failed:', error);
        throw error;
    }
}

// Send notification to all active devices
async function sendNotificationToAll(db, title, body, data = {}) {
    const tokens = await db.all('SELECT token FROM device_tokens WHERE is_active = 1');
    
    if (tokens.length === 0) {
        return { success: false, message: 'No active devices found' };
    }

    const tokenList = tokens.map(row => row.token);
    return await sendNotificationToTokens(tokenList, title, body, data);
}

// Send notification to specific users (by email or phone)
async function sendNotificationToUsers(db, userIdentifiers, title, body, data = {}) {
    const placeholders = userIdentifiers.map(() => '?').join(',');
    const tokens = await db.all(
        `SELECT token FROM device_tokens 
         WHERE is_active = 1 AND (user_email IN (${placeholders}) OR user_phone IN (${placeholders}))`,
        [...userIdentifiers, ...userIdentifiers]
    );

    if (tokens.length === 0) {
        return { success: false, message: 'No devices found for specified users' };
    }

    const tokenList = tokens.map(row => row.token);
    return await sendNotificationToTokens(tokenList, title, body, data);
}

// Send notification about new booking
async function sendBookingNotification(db, booking, type = 'confirmed') {
    let title, body, data;

    switch (type) {
        case 'confirmed':
            title = '✅ Booking Confirmed!';
            body = `Your booking at ${booking.resort_name} is confirmed for ${booking.check_in}`;
            data = { 
                type: 'booking_confirmed', 
                bookingId: booking.id.toString(),
                bookingReference: booking.booking_reference 
            };
            break;
        
        case 'reminder':
            title = '🏖️ Upcoming Stay Reminder';
            body = `Your stay at ${booking.resort_name} is tomorrow! Check-in after 2 PM`;
            data = { 
                type: 'booking_reminder', 
                bookingId: booking.id.toString() 
            };
            break;
        
        case 'cancelled':
            title = '❌ Booking Cancelled';
            body = `Your booking at ${booking.resort_name} has been cancelled`;
            data = { 
                type: 'booking_cancelled', 
                bookingId: booking.id.toString() 
            };
            break;
    }

    // Send to user who made the booking
    return await sendNotificationToUsers(db, [booking.email, booking.phone], title, body, data);
}

module.exports = {
    initializeFirebase,
    sendNotificationToTokens,
    sendNotificationToAll,
    sendNotificationToUsers,
    sendBookingNotification
};
