const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔐 Admin Password Hash Generator\n');
console.log('This will generate a bcrypt hash for your admin password.');
console.log('Add the hash to your .env file as ADMIN_PASSWORD_HASH\n');

rl.question('Enter admin password (min 8 characters): ', async (password) => {
    if (password.length < 8) {
        console.log('\n❌ Password must be at least 8 characters long');
        rl.close();
        return;
    }
    
    console.log('\n🔄 Generating hash (this may take a few seconds)...\n');
    
    try {
        const hash = await bcrypt.hash(password, 12);
        
        console.log('✅ Password hash generated successfully!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Add this to your .env file:');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('⚠️  Keep this hash secret! Do not share it or commit to git.\n');
        
    } catch (error) {
        console.error('❌ Error generating hash:', error);
    }
    
    rl.close();
});
