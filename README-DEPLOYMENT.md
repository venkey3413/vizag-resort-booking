# 🚀 EC2 Deployment Guide - Vizag Resort Booking & AI Chat

## Quick Start for EC2 Deployment

### Prerequisites
- Ubuntu 20.04+ EC2 instance (t3.medium or higher recommended)
- Security group allowing ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Domain name pointed to your EC2 IP (optional but recommended)

### Required API Keys
Before deployment, gather these API keys:
- **OpenAI API Key** (for AI chat) - Get from https://platform.openai.com/api-keys
- **Gmail App Password** (for emails) - Enable 2FA and create app password
- **Telegram Bot Token** (for notifications) - Create via @BotFather
- **Razorpay Keys** (for payments) - Get from Razorpay dashboard

## 🎯 One-Command Deployment

### Step 1: Connect to EC2 and Clone Repository
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone the repository
git clone https://github.com/venkey3413/vizag-resort-booking.git
cd vizag-resort-booking
```

### Step 2: Configure Environment
```bash
# Run the interactive setup script
./setup-env.sh
```
This will prompt you for all required API keys and create the `.env` files.

### Step 3: Deploy Everything
```bash
# Run the complete deployment script
./deploy-complete.sh
```

### Step 4: Setup Domain (Optional)
```bash
# If you have a domain, setup SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔧 Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### 1. System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
sudo apt install -y nginx git python3 python3-pip python3-venv build-essential
sudo npm install -g pm2
```

### 2. Application Setup
```bash
# Install Node.js dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Edit with your API keys

# Initialize database
node setup-db.js
```

### 3. AI Chat Setup
```bash
cd chat-app-full

# Create Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup chat environment
cp .env.example .env
nano .env  # Add your OpenAI API key

# Initialize AI database
mkdir -p chroma_store
python setup_database.py
```

### 4. Start Services
```bash
# Start Node.js services with PM2
cd /path/to/vizag-resort-booking
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Create and start chat service
sudo nano /etc/systemd/system/vizag-chat.service
# (Copy service configuration from COMPLETE_DEPLOYMENT_GUIDE.md)

sudo systemctl enable vizag-chat
sudo systemctl start vizag-chat
```

### 5. Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/vizag-resort
# (Copy nginx configuration from COMPLETE_DEPLOYMENT_GUIDE.md)

sudo ln -s /etc/nginx/sites-available/vizag-resort /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 🌐 Access Your Application

After deployment, your application will be available at:

- **Main Website**: `http://your-ec2-ip/`
- **Admin Panel**: `http://your-ec2-ip/booking-management`
- **Food Orders**: `http://your-ec2-ip/food`
- **Travel Booking**: `http://your-ec2-ip/travel`
- **AI Chat API**: `http://your-ec2-ip/docs`

## 🔍 Verification Commands

```bash
# Check all services
pm2 status
sudo systemctl status vizag-chat
sudo systemctl status nginx

# Test endpoints
curl http://localhost:3000/api/resorts
curl http://localhost:8000/docs

# View logs
pm2 logs
sudo journalctl -u vizag-chat -f
```

## 🚨 Troubleshooting

### Common Issues:

1. **Services not starting**:
   ```bash
   # Check logs
   pm2 logs
   sudo journalctl -u vizag-chat -n 50
   ```

2. **Database errors**:
   ```bash
   # Check permissions
   ls -la resort_booking.db
   sudo chown ubuntu:ubuntu resort_booking.db
   ```

3. **AI Chat not working**:
   ```bash
   # Verify OpenAI API key
   grep OPENAI_API_KEY chat-app-full/.env
   ```

4. **Payment issues**:
   ```bash
   # Check Razorpay configuration
   grep RAZORPAY .env
   ```

## 📊 Monitoring

```bash
# Real-time monitoring
pm2 monit

# System resources
htop
df -h
free -h

# Application logs
tail -f /var/log/nginx/access.log
```

## 🔄 Updates

```bash
# Update application
cd /path/to/vizag-resort-booking
git pull origin main
npm install
pm2 restart all
sudo systemctl restart vizag-chat
```

## 🔐 Security

```bash
# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Setup SSL (if you have a domain)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 📞 Support

For issues:
1. Check the logs using commands above
2. Verify all API keys are correctly set
3. Ensure all services are running
4. Check firewall and security group settings

## 🎯 Success Checklist

- [ ] All services running (PM2 + systemd)
- [ ] Website accessible via browser
- [ ] Admin panel working
- [ ] AI chat responding
- [ ] Email notifications working
- [ ] Payment processing working
- [ ] SSL certificate installed (if domain configured)

---

**Need help?** Check the detailed guide: `COMPLETE_DEPLOYMENT_GUIDE.md`