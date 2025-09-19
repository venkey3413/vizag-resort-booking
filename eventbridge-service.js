const AWS = require('aws-sdk');

// Configure EventBridge
const eventbridge = new AWS.EventBridge({
    region: 'ap-south-1' // Change to your region
});

const EVENT_BUS_NAME = 'vizag-resort-events';

// Publish event to EventBridge
async function publishEvent(source, detailType, detail) {
    try {
        const params = {
            Entries: [{
                Source: source,
                DetailType: detailType,
                Detail: JSON.stringify(detail),
                EventBusName: EVENT_BUS_NAME
            }]
        };
        
        const result = await eventbridge.putEvents(params).promise();
        console.log(`📡 Event published: ${detailType}`);
        return result;
    } catch (error) {
        console.error('❌ EventBridge publish failed:', error);
        throw error;
    }
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