const { publishEvent, EVENTS } = require('./eventbridge-service');

async function testEventBridge() {
    console.log('🧪 Testing EventBridge connectivity...');
    
    try {
        // Test publishing a simple event
        await publishEvent('test.service', 'test.event', {
            message: 'EventBridge test',
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ EventBridge test event published successfully');
        
        // Test all event types
        const testEvents = [
            { source: 'resort.booking', type: EVENTS.BOOKING_CREATED, data: { bookingId: 'test123' } },
            { source: 'resort.booking', type: EVENTS.PAYMENT_UPDATED, data: { bookingId: 'test123', status: 'paid' } },
            { source: 'food.order', type: 'food.order.created', data: { orderId: 'FO123' } },
            { source: 'food.menu', type: 'food.item.created', data: { itemId: 1, name: 'Test Item' } }
        ];
        
        for (const event of testEvents) {
            await publishEvent(event.source, event.type, event.data);
            console.log(`✅ Published: ${event.type}`);
        }
        
        console.log('🎉 All EventBridge tests passed!');
        
    } catch (error) {
        console.error('❌ EventBridge test failed:', error);
        console.log('🔍 Checking AWS credentials and configuration...');
        
        // Check environment variables
        const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('❌ Missing environment variables:', missingVars);
        } else {
            console.log('✅ AWS environment variables are set');
        }
        
        // Test basic AWS connectivity
        const AWS = require('aws-sdk');
        const eventbridge = new AWS.EventBridge({
            region: process.env.AWS_REGION || 'ap-south-1'
        });
        
        try {
            await eventbridge.listEventBuses().promise();
            console.log('✅ AWS EventBridge service is accessible');
        } catch (awsError) {
            console.error('❌ AWS EventBridge service error:', awsError.message);
        }
    }
}

// Run test if called directly
if (require.main === module) {
    require('dotenv').config();
    testEventBridge().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { testEventBridge };