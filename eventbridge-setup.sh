#!/bin/bash

# EventBridge Real-time Sync Setup Script
# Run this on your EC2 instance with IAM role permissions

REGION="ap-south-1"
EVENT_BUS_NAME="vizag-resort-events"
QUEUE_NAME="vizag-resort-events-queue"

echo "🚀 Setting up EventBridge real-time sync..."

# Create custom event bus
aws events create-event-bus --name $EVENT_BUS_NAME --region $REGION

# Create SQS queue for receiving events
QUEUE_URL=$(aws sqs create-queue --queue-name $QUEUE_NAME --region $REGION --query 'QueueUrl' --output text)
echo "📦 SQS Queue created: $QUEUE_URL"

# Get queue ARN
QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)

# Create EventBridge rule to send all events to SQS
aws events put-rule \
  --name "vizag-resort-sync-rule" \
  --event-pattern '{"source":["vizag.resort"]}' \
  --state ENABLED \
  --event-bus-name $EVENT_BUS_NAME \
  --region $REGION

# Add SQS as target for the rule
aws events put-targets \
  --rule "vizag-resort-sync-rule" \
  --event-bus-name $EVENT_BUS_NAME \
  --targets "Id"="1","Arn"="$QUEUE_ARN" \
  --region $REGION

# Allow EventBridge to send messages to SQS
aws sqs set-queue-attributes \
  --queue-url $QUEUE_URL \
  --attributes '{
    "Policy": "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Principal\": {\"Service\": \"events.amazonaws.com\"},
        \"Action\": \"sqs:SendMessage\",
        \"Resource\": \"'$QUEUE_ARN'\"
      }]
    }"
  }' \
  --region $REGION

echo "✅ EventBridge setup complete!"
echo "📝 Add this to your .env file:"
echo "EVENTBRIDGE_QUEUE_URL=$QUEUE_URL"