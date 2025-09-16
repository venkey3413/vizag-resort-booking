# AWS Setup Instructions

## 1. Create S3 Bucket
```bash
# Create bucket (replace with your bucket name)
aws s3 mb s3://vizag-resort-backups --region ap-south-1
```

## 2. Create IAM Role for EC2
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::vizag-resort-backups/*"
        }
    ]
}
```

## 3. Attach IAM Role to EC2 Instance
1. Go to EC2 Console
2. Select your instance
3. Actions → Security → Modify IAM role
4. Attach the created role

## 4. Update Bucket Name in Code
Edit `backup-service.js`:
```javascript
const BUCKET_NAME = 'your-actual-bucket-name';
```

## 5. Install Dependencies on EC2
```bash
npm install
```

## Features:
- ✅ Database backup to S3 every 6 hours
- ✅ Invoice generation on payment confirmation
- ✅ Automatic backup when marking as paid
- ✅ Data persistence even if EC2 is terminated