const EventSource = require('eventsource');

console.log('🧪 Testing SSE connection to booking server...');

const eventSource = new EventSource('http://localhost:3002/api/events');

eventSource.onopen = function(event) {
    console.log('✅ SSE connection opened');
};

eventSource.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('📡 Received SSE message:', data);
    } catch (error) {
        console.log('📡 Received raw SSE message:', event.data);
    }
};

eventSource.onerror = function(event) {
    console.error('❌ SSE connection error:', event);
};

// Test for 10 seconds then close
setTimeout(() => {
    console.log('🔚 Closing SSE connection');
    eventSource.close();
    process.exit(0);
}, 10000);