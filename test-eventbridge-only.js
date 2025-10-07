const { publishEvent, EVENTS } = require('./eventbridge-service');

async function testEventBridge() {
    console.log('🧪 Testing EventBridge connection...');
    
    try {
        const result = await publishEvent('vizag.test', 'test.event', {
            message: 'EventBridge test from EC2',
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ EventBridge test successful:', result);
    } catch (error) {
        console.error('❌ EventBridge test failed:', error.message);
    }
}

testEventBridge();