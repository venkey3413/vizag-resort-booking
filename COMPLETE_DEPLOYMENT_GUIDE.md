# Complete Deployment Guide - Vizag Resort Booking System & AI Chat App

## 🏗️ Architecture Overview

This repository contains two main applications:
1. **Resort Booking System** (Node.js/Express) - Main website with booking functionality
2. **AI Chat App** (Python/FastAPI) - Intelligent chat assistant with RAG capabilities

## 📋 Prerequisites

### Server Requirements
- Ubuntu 20.04+ EC2 instance (t3.medium or higher recommended)
- 4GB+ RAM, 20GB+ storage
- Domain name pointed to your EC2 instance
- SSL certificate (Let's Encrypt recommended)

### Required API Keys
- **OpenAI API Key** (for AI chat functionality)
- **Razorpay Keys** (for payment processing)
- **Gmail App Password** (for email notifications)
- **Telegram Bot Token** (for notifications)
- **AWS Credentials** (for S3 backups)

## 🚀 Part 1: Resort Booking System Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### Step 2: Clone and Setup Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/venkey3413/vizag-resort-booking.git
sudo chown -R $USER:$USER /opt/vizag-resort-booking
cd /opt/vizag-resort-booking

# Install dependencies
npm install
```

### Step 3: Environment Configuration

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

**Configure your .env file:**
```env
# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# OpenAI Configuration (for AI chat)
OPENAI_API_KEY=your-openai-api-key

# Production Environment
NODE_ENV=production
```

### Step 4: Database Setup

```bash
# Initialize database
node setup-db.js

# The application will automatically create SQLite database with sample data
```

### Step 5: PM2 Process Management

```bash
# Start all services using PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### Step 6: Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/vizag-resort
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Main website
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
    location /booking-management {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # AI Chat API
    location /api/chat {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Chat widget static files
    location /chat-widget {
        proxy_pass http://localhost:8000/static;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/vizag-resort /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
```

## 🤖 Part 2: AI Chat App Deployment

### Step 1: Python Environment Setup

```bash
# Install Python and dependencies
sudo apt install -y python3 python3-pip python3-venv build-essential

# Navigate to chat app directory
cd /opt/vizag-resort-booking/chat-app-full

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 2: Chat App Configuration

```bash
# Create environment file for chat app
cp .env.example .env
nano .env
```

**Chat App .env:**
```env
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=sqlite:///./app.db
RAG_DB_DIR=chroma_store
```

### Step 3: Initialize Chat Database

```bash
# Create necessary directories
mkdir -p chroma_store static

# Initialize the RAG database (this will create embeddings)
python setup_database.py
```

### Step 4: Systemd Service for Chat App

```bash
# Create systemd service
sudo nano /etc/systemd/system/vizag-chat.service
```

**Service Configuration:**
```ini
[Unit]
Description=Vizag Resort AI Chat Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/vizag-resort-booking/chat-app-full
Environment=PATH=/opt/vizag-resort-booking/chat-app-full/venv/bin
EnvironmentFile=/opt/vizag-resort-booking/chat-app-full/.env
ExecStart=/opt/vizag-resort-booking/chat-app-full/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable vizag-chat
sudo systemctl start vizag-chat
```

## 🔧 Part 3: Integration & Testing

### Step 1: Verify All Services

```bash
# Check PM2 processes
pm2 status

# Check chat service
sudo systemctl status vizag-chat

# Check Nginx
sudo systemctl status nginx

# Test endpoints
curl http://localhost:3000/api/resorts
curl http://localhost:8000/docs
```

### Step 2: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw --force enable
```

### Step 3: Monitoring Setup

```bash
# Setup log monitoring
pm2 install pm2-logrotate

# View logs
pm2 logs                           # All PM2 logs
sudo journalctl -u vizag-chat -f   # Chat service logs
sudo tail -f /var/log/nginx/access.log  # Nginx logs
```

## 📱 Part 4: Chat Widget Integration

### Step 1: Embed Chat Widget

Add this to your website's HTML:

```html
<!-- Chat Widget Integration -->
<div id="vizag-chat-widget"></div>
<script>
  (function() {
    var chatWidget = document.createElement('iframe');
    chatWidget.src = 'https://your-domain.com/chat-widget/chat-widget.html';
    chatWidget.style.cssText = 'position:fixed;bottom:20px;right:20px;width:350px;height:500px;border:none;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;';
    chatWidget.id = 'vizag-chat-iframe';
    document.body.appendChild(chatWidget);
  })();
</script>
```

### Step 2: Test Chat Functionality

1. Visit your website
2. Look for the chat widget in the bottom-right corner
3. Test with questions like:
   - "What resorts do you have?"
   - "How do I make a booking?"
   - "What are your prices?"

## 🔄 Part 5: Maintenance & Updates

### Daily Monitoring

```bash
# Check system health
pm2 monit
sudo systemctl status vizag-chat
df -h  # Check disk space
free -h  # Check memory usage
```

### Update Deployment

```bash
# Update code
cd /opt/vizag-resort-booking
git pull origin main

# Restart services
pm2 restart all
sudo systemctl restart vizag-chat
```

### Backup Strategy

```bash
# Backup database
cp resort_booking.db resort_booking_backup_$(date +%Y%m%d).db

# Backup chat embeddings
tar -czf chroma_store_backup_$(date +%Y%m%d).tar.gz chat-app-full/chroma_store/
```

## 🚨 Troubleshooting

### Common Issues

1. **PM2 processes not starting:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.js
   ```

2. **Chat service fails:**
   ```bash
   sudo journalctl -u vizag-chat -n 50
   # Check for missing dependencies or API key issues
   ```

3. **Database connection issues:**
   ```bash
   # Check file permissions
   ls -la resort_booking.db
   sudo chown ubuntu:ubuntu resort_booking.db
   ```

4. **Nginx 502 errors:**
   ```bash
   # Check if services are running
   pm2 status
   sudo systemctl status vizag-chat
   ```

### Performance Optimization

1. **Enable Nginx caching:**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

2. **PM2 cluster mode:**
   ```bash
   pm2 start server.js -i max --name "main-server-cluster"
   ```

## 📊 Monitoring & Analytics

### Setup Monitoring

```bash
# Install monitoring tools
npm install -g pm2-web
pm2-web --port 8080  # Access at http://your-domain:8080
```

### Log Analysis

```bash
# Analyze access patterns
sudo tail -f /var/log/nginx/access.log | grep -E "(booking|chat)"

# Monitor API usage
pm2 logs | grep -E "(POST|GET) /api"
```

## 🎯 Success Metrics

After deployment, you should have:

✅ **Resort Booking System:**
- Main website accessible at https://your-domain.com
- Admin panel at https://your-domain.com/booking-management
- Food ordering at https://your-domain.com/food
- Travel booking at https://your-domain.com/travel

✅ **AI Chat System:**
- Chat widget embedded on website
- AI responses working with OpenAI
- RAG system providing resort-specific answers
- Chat API accessible at https://your-domain.com/api/chat

✅ **Integration Features:**
- Real-time notifications via Telegram
- Email confirmations working
- Payment processing via Razorpay
- Database backups to S3

## 📞 Support

For issues or questions:
1. Check the logs first using the commands above
2. Verify all environment variables are set correctly
3. Ensure all API keys are valid and have proper permissions
4. Check firewall and security group settings

This deployment guide provides a complete production-ready setup for both the resort booking system and AI chat application.