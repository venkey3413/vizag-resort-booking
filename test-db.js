const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function testDatabase() {
    try {
        console.log('🔍 Testing database connection...');
        
        const db = await open({
            filename: './resort_booking.db',
            driver: sqlite3.Database
        });
        
        console.log('✅ Database connected');
        
        // Test resorts table
        const resorts = await db.all('SELECT id, name, location, price, description, image, available FROM resorts WHERE available = 1');
        console.log('🏨 Resorts found:', resorts.length);
        
        if (resorts.length === 0) {
            console.log('❌ No resorts in database!');
            
            // Insert sample resort
            await db.run(`
                INSERT INTO resorts (name, location, price, description, image, available) VALUES
                ('Test Resort', 'Vizag', 3000, 'Test resort for mobile app', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500', 1)
            `);
            
            console.log('✅ Sample resort added');
        } else {
            console.log('📋 Resort details:');
            resorts.forEach(resort => {
                console.log(`- ${resort.name} (${resort.location}) - ₹${resort.price}`);
            });
        }
        
        await db.close();
        console.log('✅ Database test completed');
        
    } catch (error) {
        console.error('❌ Database error:', error);
    }
}

testDatabase();