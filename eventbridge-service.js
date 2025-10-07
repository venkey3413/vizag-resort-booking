const AWS = require('aws-sdk');

// Initialize EventBridge with IAM role (EC2 instance profile)
const eventbridge = new AWS.EventBridge({
    region: process.env.AWS_REGION || 'ap-south-1'
});

const EVENT_BUS_NAME = 'vizag-resort-events';

// Publish event to EventBridge only
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
        console.log(`📡 EventBridge published: ${detailType}`);
        return result;
    } catch (error) {
        console.error('❌ EventBridge publish failed:', error.message);
        throw error;
    }
}

// Event types
const EVENTS = {
    BOOKING_CREATED: 'booking.created',
    BOOKING_UPDATED: 'booking.updated', 
    PAYMENT_UPDATED: 'payment.updated',
    FOOD_ORDER_CREATED: 'food.order.created',
    FOOD_ORDER_UPDATED: 'food.order.updated',
    FOOD_ITEM_CREATED: 'food.item.created',
    FOOD_ITEM_UPDATED: 'food.item.updated',
    FOOD_ITEM_DELETED: 'food.item.deleted',
    RESORT_AVAILABILITY_UPDATED: 'resort.availability.updated'
};

module.exports = {
    publishEvent,
    EVENTS,
    EVENT_BUS_NAME
};