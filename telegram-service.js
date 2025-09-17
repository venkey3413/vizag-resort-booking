const https = require('https');

const TELEGRAM_BOT_TOKEN = '8187811852:AAHAJ967MJRc0fO8Z07g1ljGhedGPW76G6o';
const TELEGRAM_CHAT_ID = '1815102420';

async function sendTelegramNotification(message) {
    if (!message || message.trim() === '') {
        console.error('❌ Empty message, skipping Telegram notification');
        return false;
    }
    
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('📱 Telegram notification sent successfully');
                    resolve(true);
                } else {
                    console.error('❌ Telegram notification failed:', responseData);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Telegram request error:', error);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

function formatBookingNotification(booking) {
    const message = `🏨 NEW BOOKING RECEIVED!

📋 Booking ID: ${booking.id}
👤 Guest: ${booking.guest_name}
📧 Email: ${booking.email}
📱 Phone: ${booking.phone}
🏖️ Resort: ${booking.resort_name}
📅 Check-in: ${booking.check_in}
📅 Check-out: ${booking.check_out}
👥 Guests: ${booking.guests}
💰 Total: ₹${booking.total_price.toLocaleString()}
💳 Status: ${booking.payment_status}

⏰ Booked at: ${new Date().toLocaleString('en-IN')}`;
    
    console.log('📱 Telegram message:', message);
    return message;
}

module.exports = {
    sendTelegramNotification,
    formatBookingNotification
};