const https = require('https');

const TELEGRAM_BOT_TOKEN = '8187811852:AAHAJ967MJRc0fO8Z07g1ljGhedGPW76G6o';
const TELEGRAM_CHAT_ID = '1815102420';

async function sendTelegramNotification(message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
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
    return `🏨 <b>NEW BOOKING RECEIVED!</b>

📋 <b>Booking ID:</b> ${booking.id}
👤 <b>Guest:</b> ${booking.guest_name}
📧 <b>Email:</b> ${booking.email}
📱 <b>Phone:</b> ${booking.phone}
🏖️ <b>Resort:</b> ${booking.resort_name}
📅 <b>Check-in:</b> ${booking.check_in}
📅 <b>Check-out:</b> ${booking.check_out}
👥 <b>Guests:</b> ${booking.guests}
💰 <b>Total:</b> ₹${booking.total_price.toLocaleString()}
💳 <b>Status:</b> ${booking.payment_status}

⏰ <b>Booked at:</b> ${new Date().toLocaleString('en-IN')}`;
}

module.exports = {
    sendTelegramNotification,
    formatBookingNotification
};