const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Vizag Resort Booking System...');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Please create .env file with the following variables:');
    console.log(`
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password

# Telegram Configuration (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# AWS Configuration (optional)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Razorpay Configuration (optional)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# JWT Secret for owner authentication
JWT_SECRET=your-jwt-secret-key
    `);
} else {
    console.log('✅ .env file found');
}

// Check if database exists
const dbPath = path.join(__dirname, 'resort_booking.db');
if (!fs.existsSync(dbPath)) {
    console.log('📊 Database will be created on first run');
} else {
    console.log('✅ Database file found');
}

// Check required directories
const requiredDirs = ['public', 'admin-public', 'bookings-public', 'food-public', 'owner-public'];
requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`✅ ${dir} directory found`);
    } else {
        console.log(`❌ ${dir} directory missing`);
    }
});

console.log('\n🚀 Setup complete! Run "npm run start-all" to start all servers.');
console.log('\n📋 Available endpoints:');
console.log('- Main Website: http://localhost:3000');
console.log('- Admin Panel: http://localhost:3001');
console.log('- Booking Management: http://localhost:3002');
console.log('- Food Service: http://localhost:3000/food');
console.log('- Owner Dashboard: http://localhost:3000/owner-dashboard');
console.log('\n🔧 For EventBridge testing: npm run test-sse');