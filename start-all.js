const { spawn } = require('child_process');

console.log('🚀 Starting Resort Booking Microservices...\n');

// Start main app (port 3000)
const mainApp = spawn('node', ['server.js'], { stdio: 'inherit' });
console.log('✅ Main App started on http://localhost:3000');

// Start admin panel (port 3001)
const adminApp = spawn('node', ['admin-server.js'], { stdio: 'inherit' });
console.log('✅ Admin Panel started on http://localhost:3001');

// Start booking service (port 3002)
const bookingApp = spawn('node', ['booking-server.js'], { stdio: 'inherit' });
console.log('✅ Booking Service started on http://localhost:3002');

console.log('\n🌟 All services are running!');
console.log('📱 Main Website: http://localhost:3000');
console.log('⚙️  Admin Panel: http://localhost:3001');
console.log('📊 Booking History: http://localhost:3002');

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all services...');
    mainApp.kill();
    adminApp.kill();
    bookingApp.kill();
    process.exit();
});