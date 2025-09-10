# AWS EC2 Ubuntu Deployment Guide

## Prerequisites
- AWS Account with EC2 access
- Key pair for SSH access
- Domain name (optional)

## EC2 Setup

### 1. Launch EC2 Instance
```bash
# Instance Type: t3.medium (2 vCPU, 4GB RAM)
# OS: Ubuntu 22.04 LTS
# Storage: 20GB gp3
# Security Group: Allow ports 22, 80, 443, 3000-4000
```

### 2. Security Group Rules
```
SSH (22) - Your IP
HTTP (80) - 0.0.0.0/0
HTTPS (443) - 0.0.0.0/0
Custom (3000-4000) - 0.0.0.0/0
```

## Deployment Commands

### 1. Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### 3. Clone and Setup Application
```bash
# Clone repository
git clone https://github.com/venkey3413/vizag-resort-booking.git
cd vizag-resort-booking

# Install dependencies
npm install

# Create environment file
cp .env.example .env
nano .env
```

### 4. Configure Environment (.env)
```env
# Database
DATABASE_URL=./resort_booking.db

# Razorpay (Required)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=your-s3-bucket-name
AWS_REGION=ap-south-1

# CORS
ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com

# JWT
JWT_SECRET=your_jwt_secret_key_here
```

### 5. Start Services with PM2
```bash
# Start all services
pm2 start api-gateway.js --name "gateway"
pm2 start server.js --name "main"
pm2 start admin-server.js --name "admin"
pm2 start booking-server.js --name "booking"

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/vizag-resort
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Main site
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin panel
    location /admin {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Booking history
    location /bookings {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Gateway
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. Enable Nginx Configuration
```bash
sudo ln -s /etc/nginx/sites-available/vizag-resort /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. SSL Certificate (Optional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Management Commands

### Check Services
```bash
pm2 status
pm2 logs
```

### Restart Services
```bash
pm2 restart all
```

### Update Application
```bash
git pull origin main
npm install
pm2 restart all
```

### Monitor Resources
```bash
htop
pm2 monit
```

## Security Checklist

- [ ] Change default SSH port
- [ ] Disable root login
- [ ] Configure firewall (ufw)
- [ ] Regular security updates
- [ ] Backup database regularly
- [ ] Monitor application logs

## Troubleshooting

### Service Not Starting
```bash
pm2 logs gateway
pm2 logs main
```

### Database Issues
```bash
ls -la resort_booking.db
chmod 644 resort_booking.db
```

### Port Conflicts
```bash
sudo netstat -tulpn | grep :3000
```

## Cost Optimization

- Use t3.micro for testing (free tier)
- Use t3.medium for production
- Enable detailed monitoring
- Set up CloudWatch alarms
- Use Elastic IP for static IP