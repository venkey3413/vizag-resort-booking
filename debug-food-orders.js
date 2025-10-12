// Debug script to test food order functionality
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function debugFoodOrders() {
    console.log('🔍 Starting food order debug...');
    
    try {
        // Open database
        const db = await open({
            filename: './resort_booking.db',
            driver: sqlite3.Database
        });
        
        console.log('✅ Database connected');
        
        // Check if food_orders table exists
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📋 Available tables:', tables.map(t => t.name));
        
        // Check food_orders table structure
        try {
            const foodOrdersSchema = await db.all("PRAGMA table_info(food_orders)");
            console.log('🍽️ Food orders table schema:', foodOrdersSchema);
            
            const foodOrdersCount = await db.get("SELECT COUNT(*) as count FROM food_orders");
            console.log('📊 Food orders count:', foodOrdersCount.count);
            
            if (foodOrdersCount.count > 0) {
                const recentOrders = await db.all("SELECT * FROM food_orders ORDER BY order_time DESC LIMIT 3");
                console.log('📝 Recent food orders:', recentOrders);
            }
        } catch (error) {
            console.log('❌ Food orders table does not exist or has issues:', error.message);
        }
        
        // Check food_items table
        try {
            const foodItemsCount = await db.get("SELECT COUNT(*) as count FROM food_items");
            console.log('🍕 Food items count:', foodItemsCount.count);
            
            if (foodItemsCount.count > 0) {
                const sampleItems = await db.all("SELECT id, name, price FROM food_items LIMIT 3");
                console.log('🍽️ Sample food items:', sampleItems);
            }
        } catch (error) {
            console.log('❌ Food items table does not exist:', error.message);
        }
        
        // Check bookings table for validation
        try {
            const paidBookings = await db.all(`
                SELECT id, booking_reference, guest_name, check_in, payment_status 
                FROM bookings 
                WHERE payment_status = 'paid' 
                ORDER BY booking_date DESC 
                LIMIT 3
            `);
            console.log('🏨 Recent paid bookings for food order validation:', paidBookings);
        } catch (error) {
            console.log('❌ Bookings table issue:', error.message);
        }
        
        await db.close();
        console.log('✅ Debug completed');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

// Check environment variables
console.log('🔧 Environment check:');
console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Missing');
console.log('- TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? 'Set' : 'Missing');
console.log('- EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Missing');
console.log('- RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Set' : 'Missing');

debugFoodOrders();