const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function setupDatabase() {
    try {
        console.log('🔧 Setting up database...');
        
        const db = await open({
            filename: './resort_booking.db',
            driver: sqlite3.Database
        });
        
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
                available INTEGER DEFAULT 1
            )
        `);
        
        console.log('✅ Resorts table created');
        
        // Insert sample resorts
        const resortCount = await db.get('SELECT COUNT(*) as count FROM resorts');
        if (resortCount.count === 0) {
            await db.run(`
                INSERT INTO resorts (name, location, price, description, image, map_link) VALUES
                ('Paradise Beach Resort', 'Vizag Beach', 5000, 'Luxury beachfront resort with stunning ocean views', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500', 'https://maps.google.com/?q=Vizag+Beach'),
                ('Mountain View Resort', 'Araku Valley', 4000, 'Peaceful mountain retreat with breathtaking views', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500', 'https://maps.google.com/?q=Araku+Valley'),
                ('Sunset Villa Resort', 'Rushikonda', 6000, 'Premium resort with sunset views', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500', 'https://maps.google.com/?q=Rushikonda')
            `);
            
            console.log('✅ Sample resorts added');
        }
        
        // Verify data
        const resorts = await db.all('SELECT * FROM resorts');
        console.log(`📊 Total resorts: ${resorts.length}`);
        
        await db.close();
        console.log('✅ Database setup completed');
        
    } catch (error) {
        console.error('❌ Setup error:', error);
    }
}

setupDatabase();