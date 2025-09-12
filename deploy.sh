#!/bin/bash

# Resort Booking System - Deployment Script
# Run this script on a fresh Ubuntu EC2 instance

echo "🚀 Starting Resort Booking System Deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update -y

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install express cors sqlite3 sqlite socket.io multer aws-sdk nodemailer cookie-parser express-session csurf node-cron pdfkit dotenv

# Create .env file template
echo "📝 Creating .env template..."
cat > .env << EOL
# Gmail Configuration for Email Notifications
GMAIL_APP_PASSWORD=your-16-character-gmail-app-password

# AWS S3 Configuration for Backups and Invoices
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-south-1
S3_BUCKET=resort3413
EOL

echo "⚠️  IMPORTANT: Edit .env file with your actual credentials!"
echo "   nano .env"

# Start all services with PM2
echo "🚀 Starting services..."
pm2 start server.js --name "main-server"
pm2 start admin-server.js --name "admin-server"
pm2 start booking-server.js --name "booking-server"

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo "🔧 Setting up PM2 startup..."
pm2 startup

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file: nano .env"
echo "2. Add your Gmail app password and AWS credentials"
echo "3. Run the PM2 startup command shown above"
echo "4. Configure EC2 Security Group to allow ports 3000, 3001, 3002"
echo ""
echo "🌐 Access your applications:"
echo "   Main Website: http://YOUR-EC2-IP:3000"
echo "   Admin Panel:  http://YOUR-EC2-IP:3001"
echo "   Booking History: http://YOUR-EC2-IP:3002"
echo ""
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs"