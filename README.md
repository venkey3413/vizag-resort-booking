# Resort Booking System

A complete resort booking management system with real-time updates, email notifications, and admin panel.

## Features

- 🏨 **Resort Management** - Add, edit, delete resorts with images and videos
- 📅 **Real-time Booking** - Instant availability updates and booking confirmations
- 📧 **Email Notifications** - Automatic booking confirmations via Gmail
- 🗺️ **Google Maps Integration** - Location links for each resort
- 📊 **Admin Panel** - Complete resort and booking management
- 📋 **Booking History** - Track all bookings and invoices
- 🔄 **Database Backup** - Daily automatic backups to AWS S3
- 📄 **PDF Invoices** - Professional invoices stored in S3
- 🔒 **Security** - CSRF protection and session management

## Quick Deployment

### Option 1: One-Command Deploy
```bash
git clone https://github.com/venkey3413/vizag-resort-booking.git
cd vizag-resort-booking
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual Setup
```bash
# Install dependencies
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/venkey3413/vizag-resort-booking.git
cd vizag-resort-booking
npm install

# Create .env file
nano .env
```

## Environment Configuration

Create `.env` file with:
```bash
GMAIL_APP_PASSWORD=your-16-character-gmail-app-password
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-south-1
S3_BUCKET=resort3413
```

## Start Services

```bash
pm2 start server.js --name "main-server"
pm2 start admin-server.js --name "admin-server"
pm2 start booking-server.js --name "booking-server"
pm2 save
pm2 startup
```

## Access Applications

- **Main Website:** `http://your-ec2-ip:3000`
- **Admin Panel:** `http://your-ec2-ip:3001`
- **Booking History:** `http://your-ec2-ip:3002`

## Security Group Settings

Allow inbound traffic on ports:
- 22 (SSH)
- 3000 (Main Website)
- 3001 (Admin Panel)
- 3002 (Booking History)

## Gmail Setup

1. Enable 2-Factor Authentication in Gmail
2. Generate App Password: Gmail → Security → App passwords
3. Use 16-character password in .env file

## AWS S3 Setup

1. Create S3 bucket (e.g., resort3413)
2. Create IAM user with S3 permissions
3. Generate Access Key and Secret Key
4. Add credentials to .env file

## Google Drive Images

Convert Google Drive links:
- Original: `https://drive.google.com/file/d/FILE_ID/view`
- Use: `https://drive.google.com/uc?id=FILE_ID`

## Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Manual backup
node -e "require('./backup-service').manualBackup()"
```

## Support

For issues or questions, contact: vizagresortbooking@gmail.com