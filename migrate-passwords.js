require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

async function migratePasswords() {
    const db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    console.log('🔄 Starting password migration...');
    console.log('⚠️  This will convert all Base64 passwords to bcrypt hashes\n');
    
    // Get all owners
    const owners = await db.all('SELECT id, name, email, phone, password FROM owners');
    
    console.log(`Found ${owners.length} owners to check\n`);
    
    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const owner of owners) {
        // Check if password is already bcrypt hashed (starts with $2b$)
        if (owner.password.startsWith('$2b$') || owner.password.startsWith('$2a$')) {
            console.log(`⏭️  Owner ID ${owner.id} (${owner.name}) - Already using bcrypt`);
            skipped++;
            continue;
        }
        
        console.log(`🔄 Migrating owner ID ${owner.id}: ${owner.name} (${owner.email || owner.phone})`);
        
        try {
            // Decode the Base64 password to get original password
            const originalPassword = Buffer.from(owner.password, 'base64').toString('utf-8');
            
            console.log(`   Original password length: ${originalPassword.length} characters`);
            
            // Re-hash with bcrypt (12 rounds for strong security)
            const hashedPassword = await bcrypt.hash(originalPassword, 12);
            
            // Update in database
            await db.run(
                'UPDATE owners SET password = ? WHERE id = ?',
                [hashedPassword, owner.id]
            );
            
            console.log(`   ✅ Successfully migrated owner ID ${owner.id}\n`);
            migrated++;
        } catch (error) {
            console.error(`   ❌ Failed to migrate owner ID ${owner.id}:`, error.message);
            console.error(`   Password value: ${owner.password.substring(0, 20)}...\n`);
            failed++;
        }
    }
    
    console.log('═══════════════════════════════════════');
    console.log('Migration Summary:');
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped (already bcrypt): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${owners.length}`);
    console.log('═══════════════════════════════════════\n');
    
    if (migrated > 0) {
        console.log('✅ Migration complete! All passwords are now securely hashed with bcrypt.');
        console.log('⚠️  Owners can now login with their original passwords.');
    } else if (skipped === owners.length) {
        console.log('✅ All passwords are already using bcrypt. No migration needed.');
    } else {
        console.log('⚠️  Some passwords could not be migrated. Please check the errors above.');
    }
    
    await db.close();
}

migratePasswords().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
