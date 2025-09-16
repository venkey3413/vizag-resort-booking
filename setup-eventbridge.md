# EventBridge Setup Instructions

## 1. Create Custom Event Bus
```bash
aws events create-event-bus --name vizag-resort-events --region ap-south-1
```

## 2. Create IAM Policy for EventBridge
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "events:PutEvents",
                "events:ListRules",
                "events:DescribeRule"
            ],
            "Resource": "*"
        }
    ]
}
```

## 3. Attach Policy to EC2 IAM Role
- Add EventBridge permissions to existing EC2 role

## 4. Install Dependencies
```bash
npm install
```

## 5. Start All Services
```bash
npm run dev
```

## How It Works:
1. **EventBridge Events**: Published on all CRUD operations
2. **WebSocket Server**: Receives events and broadcasts to clients
3. **Real-time Updates**: All pages refresh automatically
4. **IP Independent**: Works after EC2 restart with new IP

## Event Types:
- Resort Added/Updated/Deleted
- Booking Created/Deleted
- Payment Updated

## Benefits:
✅ No IP address dependency
✅ Survives EC2 termination/restart
✅ Managed AWS service
✅ Real-time sync across all services