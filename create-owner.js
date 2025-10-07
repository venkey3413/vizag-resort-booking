const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

async function createOwner() {
    const db = await open({
        filename: './resort_booking.db',
        driver: sqlite3.Database
    });
    
    // Sample owner data
    const ownerData = {
        name: 'John Resort Owner',
        email: 'owner@vizagresort.com',
        password: 'owner123',
        resortIds: '1,2' // Resort IDs 1 and 2
    };
    
    // Hash password
    const hashedPassword = await bcrypt.hash(ownerData.password, 10);
    
    // Insert owner
    await db.run(
        'INSERT OR REPLACE INTO resort_owners (name, email, password, resort_ids) VALUES (?, ?, ?, ?)',
        [ownerData.name, ownerData.email, hashedPassword, ownerData.resortIds]
    );
    
    console.log('Sample owner created:');
    console.log('Email: owner@vizagresort.com');
    console.log('Password: owner123');
    console.log('Resorts: 1, 2');
    
    await db.close();
}

createOwner().catch(console.error);