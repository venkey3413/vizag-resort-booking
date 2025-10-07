# EventBridge Setup for Vizag Resort Booking

## Architecture
- **EventBridge Only**: No SSE, no polling, no direct HTTP calls
- **IAM Role**: EC2 instance profile with EventBridge permissions
- **Custom Event Bus**: `vizag-resort-events`

## AWS Setup

### 1. Create Custom Event Bus
```bash
aws events create-event-bus --name vizag-resort-events --region ap-south-1
```

### 2. Create IAM Role for EC2
```bash
# Create role
aws iam create-role --role-name VizagResortEventBridgeRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Attach policy
aws iam put-role-policy --role-name VizagResortEventBridgeRole --policy-name EventBridgeAccess --policy-document file://iam-policy.json

# Create instance profile
aws iam create-instance-profile --instance-profile-name VizagResortEventBridgeProfile

# Add role to instance profile
aws iam add-role-to-instance-profile --instance-profile-name VizagResortEventBridgeProfile --role-name VizagResortEventBridgeRole
```

### 3. Attach Instance Profile to EC2
```bash
aws ec2 associate-iam-instance-profile --instance-id i-1234567890abcdef0 --iam-instance-profile Name=VizagResortEventBridgeProfile
```

## Event Sources & Types

### Sources
- `vizag.resort` - Resort booking events
- `vizag.food` - Food order events

### Event Types
- `booking.created` - New booking created
- `booking.updated` - Booking status changed
- `payment.updated` - Payment status changed
- `food.order.created` - New food order
- `food.order.updated` - Food order status changed

## Event Flow
1. **Action occurs** (booking created, payment updated, etc.)
2. **Server publishes event** to EventBridge custom bus
3. **EventBridge triggers** Lambda functions or other targets
4. **Lambda functions** update databases, send notifications, etc.

## No Client-Side Real-Time
- Removed all SSE endpoints
- Removed polling mechanisms
- Frontend refreshes on user actions only
- Real-time updates handled server-side via EventBridge

## Benefits
- **Secure**: No exposed polling endpoints
- **Scalable**: EventBridge handles event routing
- **Reliable**: AWS managed service with retries
- **Decoupled**: Services communicate via events only