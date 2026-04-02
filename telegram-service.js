const https = require('https');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramNotification(message) {
    // Check if Telegram is configured
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || 
        TELEGRAM_BOT_TOKEN === 'your-telegram-bot-token' || 
        TELEGRAM_CHAT_ID === 'your-telegram-chat-id') {
        console.warn('⚠️ Telegram notifications not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file');
        console.warn('📝 To setup Telegram notifications:');
        console.warn('   1. Create a bot with @BotFather on Telegram');
        console.warn('   2. Get your bot token');
        console.warn('   3. Get your chat ID from @userinfobot');
        console.warn('   4. Update .env file with these values');
        return false;
    }
    
    if (!message || message.trim() === '') {
        console.error('❌ Empty message, skipping Telegram notification');
        return false;
    }
    
    return new Promise((resolve, reject) => {
        const payload = {
            chat_id: TELEGRAM_CHAT_ID,
            text: message.toString(),
            parse_mode: 'HTML'
        };
        
        const data = JSON.stringify(payload);
        console.log('📤 Sending to Telegram...');

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Telegram notification sent successfully');
                    resolve(true);
                } else {
                    console.error('❌ Telegram notification failed. Status:', res.statusCode);
                    console.error('❌ Response:', responseData);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Telegram request error:', error.message);
            resolve(false);
        });

        req.on('timeout', () => {
            console.error('❌ Telegram request timeout');
            req.destroy();
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

function formatBookingNotification(booking) {
    try {
        if (!booking) {
            console.error('❌ Booking data is null or undefined');
            return null;
        }
        
        const message = `🏨 NEW BOOKING RECEIVED!

📋 Booking ID: ${booking.id || 'N/A'}
👤 Guest: ${booking.guest_name || 'N/A'}
📧 Email: ${booking.email || 'N/A'}
📱 Phone: ${booking.phone || 'N/A'}
🏖️ Resort: ${booking.resort_name || 'N/A'}
📅 Check-in: ${booking.check_in || 'N/A'}
📅 Check-out: ${booking.check_out || 'N/A'}
👥 Guests: ${booking.guests || 'N/A'}
💰 Total: ₹${booking.total_price ? booking.total_price.toLocaleString() : 'N/A'}
💳 Status: ${booking.payment_status || 'N/A'}

⏰ Booked at: ${new Date().toLocaleString('en-IN')}`;
        
        console.log('📱 Generated Telegram message');
        return message;
    } catch (error) {
        console.error('❌ Error formatting booking notification:', error);
        return null;
    }
}

module.exports = {
    sendTelegramNotification,
    formatBookingNotification
};
