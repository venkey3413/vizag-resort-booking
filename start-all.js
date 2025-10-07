const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Vizag Resort Booking System...');

// Start main server (port 3000)
const mainServer = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Start admin server (port 3001)  
const adminServer = spawn('node', ['admin-server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Start booking server (port 3002)
const bookingServer = spawn('node', ['booking-server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

console.log('✅ All servers started!');
console.log('📱 Main Website: http://localhost:3000');
console.log('👨‍💼 Admin Panel: http://localhost:3001');
console.log('📋 Booking Management: http://localhost:3002');
console.log('🍽️ Food Service: http://localhost:3000/food');
console.log('👤 Owner Dashboard: http://localhost:3000/owner-dashboard');

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all servers...');
    mainServer.kill();
    adminServer.kill();
    bookingServer.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down all servers...');
    mainServer.kill();
    adminServer.kill();
    bookingServer.kill();
    process.exit(0);
});