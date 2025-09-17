// Manual reply script
const sessionId = process.argv[2];
const reply = process.argv.slice(3).join(' ');

if (!sessionId || !reply) {
    console.log('Usage: node reply.js sessionId "your message"');
    process.exit(1);
}

// Connect to the running server's chat storage
const http = require('http');

const data = JSON.stringify({
    message: {
        text: `/reply ${sessionId} ${reply}`
    }
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/telegram-webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`✅ Reply sent: "${reply}"`);
});

req.on('error', (error) => {
    console.error('❌ Error:', error);
});

req.write(data);
req.end();