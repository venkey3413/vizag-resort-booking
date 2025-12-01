const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function cleanupHardcodedResorts() {
    console.log('🧹 Starting cleanup of hardcoded resorts...');
    
    const db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // List of hardcoded resort names to remove
    const hardcodedResorts = [
        'Paradise Beach Resort',
        'Mountain View Resort', 
        'Sunset Villa Resort'
    ];
    
    try {
        // Check existing resorts
        const allResorts = await db.all('SELECT id, name FROM resorts ORDER BY id');
        console.log('📋 Current resorts in database:', allResorts);
        
        // Remove hardcoded resorts
        for (const resortName of hardcodedResorts) {
            const result = await db.run('DELETE FROM resorts WHERE name = ?', [resortName]);
            if (result.changes > 0) {
                console.log(`❌ Removed hardcoded resort: ${resortName}`);
            }
        }
        
        // Remove dynamic pricing for deleted resorts
        await db.run('DELETE FROM dynamic_pricing WHERE resort_id NOT IN (SELECT id FROM resorts)');
        console.log('🧹 Cleaned up orphaned dynamic pricing records');
        
        // Show remaining resorts
        const remainingResorts = await db.all('SELECT id, name FROM resorts ORDER BY id');
        console.log('✅ Remaining resorts after cleanup:', remainingResorts);
        
        console.log('🎉 Cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await db.close();
    }
}

// Run cleanup
cleanupHardcodedResorts();