const AWS = require('aws-sdk');

// Configure EventBridge with fallback
let eventbridge = null;
let eventBridgeEnabled = false;

try {
    // Only initialize if AWS credentials are properly configured
    if (process.env.AWS_ACCESS_KEY_ID && 
        process.env.AWS_SECRET_ACCESS_KEY && 
        process.env.AWS_ACCESS_KEY_ID !== 'your-access-key' &&
        process.env.AWS_SECRET_ACCESS_KEY !== 'your-secret-key') {
        
        eventbridge = new AWS.EventBridge({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'ap-south-1'
        });
        eventBridgeEnabled = true;
        console.log('✅ EventBridge initialized with AWS credentials');
    } else {
        console.log('⚠️ EventBridge disabled - AWS credentials not configured');
    }
} catch (error) {
    console.log('⚠️ EventBridge initialization failed:', error.message);
}

const EVENT_BUS_NAME = 'vizag-resort-events';

// Publish event to EventBridge with fallback to direct SSE
async function publishEvent(source, detailType, detail) {
    try {
        if (eventBridgeEnabled && eventbridge) {
            const params = {
                Entries: [{
                    Source: source,
                    DetailType: detailType,
                    Detail: JSON.stringify(detail),
                    EventBusName: EVENT_BUS_NAME
                }]
            };
            
            const result = await eventbridge.putEvents(params).promise();
            console.log(`📡 EventBridge published: ${detailType}`);
            return result;
        } else {
            // Fallback: Direct notification to other services
            console.log(`📡 Direct SSE broadcast: ${detailType}`);
            await notifyOtherServices(source, detailType, detail);
            return { success: true, method: 'direct' };
        }
    } catch (error) {
        console.error('❌ EventBridge publish failed, using direct notification:', error.message);
        // Fallback to direct notification
        await notifyOtherServices(source, detailType, detail);
        return { success: true, method: 'fallback' };
    }
}

// Direct notification fallback
async function notifyOtherServices(source, detailType, detail) {
    const eventData = { type: detailType, source, ...detail };
    
    // Notify booking server (port 3002)
    try {
        await fetch('http://localhost:3002/api/eventbridge-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        }).catch(() => {});
    } catch (error) {}
    
    // Notify main server (port 3000)
    try {
        await fetch('http://localhost:3000/api/eventbridge-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        }).catch(() => {});
    } catch (error) {}
}

// Event types
const EVENTS = {
    RESORT_ADDED: 'Resort Added',
    RESORT_UPDATED: 'Resort Updated', 
    RESORT_DELETED: 'Resort Deleted',
    RESORT_CREATED: 'Resort Created',
    BOOKING_CREATED: 'Booking Created',
    BOOKING_DELETED: 'Booking Deleted',
    PAYMENT_UPDATED: 'Payment Updated'
};

module.exports = {
    publishEvent,
    EVENTS,
    EVENT_BUS_NAME
};