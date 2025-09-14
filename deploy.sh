#!/bin/bash

# Resort Booking Platform - Complete Deployment Script
# Includes all 11 features: Seasonal pricing, discount codes, reviews, analytics, etc.

echo "🚀 Starting Resort Booking Platform Deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Verify installations
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Clone repository
echo "📥 Cloning repository..."
if [ -d "vizag-resort-booking" ]; then
    cd vizag-resort-booking
    git pull origin main
else
    git clone https://github.com/venkey3413/vizag-resort-booking.git
    cd vizag-resort-booking
fi

# Install all dependencies
echo "📦 Installing dependencies..."
npm install express cors socket.io sqlite3 sqlite multer aws-sdk multer-s3 nodemailer axios dotenv node-cron jsonwebtoken express-rate-limit express-validator helmet crypto amazon-cognito-identity-js

# Install PM2 globally
echo "🔧 Installing PM2..."
sudo npm install -g pm2

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# AWS S3 Configuration
S3_BUCKET=your_s3_bucket_name
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id

# JWT Configuration
JWT_SECRET=your-jwt-secret-key

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Server Configuration
PORT=3000
ADMIN_PORT=3001
BOOKING_PORT=3002

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
EOF
    echo "⚠️  Please edit .env file with your actual credentials!"
fi

# Create secure directories
mkdir -p data backups
chmod 700 data backups

# Set proper permissions
chmod +x *.js
chmod 755 public/
chmod 755 admin-public/

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 delete all 2>/dev/null || true

# Start all services
echo "🚀 Starting all services..."

# Main server (Port 3000) - Customer website
pm2 start server.js --name "main-server" --watch --ignore-watch="node_modules database.db *.log"

# Admin server (Port 3001) - Admin panel with dashboard & analytics
pm2 start admin-server.js --name "admin-server" --watch --ignore-watch="node_modules database.db *.log"

# Booking history server (Port 3002) - Booking management & calendar
pm2 start booking-server.js --name "booking-server" --watch --ignore-watch="node_modules database.db *.log"

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Services Status:"
pm2 status

echo ""
echo "🌐 Access URLs:"
echo "   Main Website: http://$(curl -s ifconfig.me):3000"
echo "   Admin Panel:  http://$(curl -s ifconfig.me):3001"
echo "   Booking Mgmt: http://$(curl -s ifconfig.me):3002"
echo ""
echo "✨ Features Included:"
echo "   ✅ Seasonal Pricing (Peak/Off-peak rates)"
echo "   ✅ Discount Codes (Promotional system)"
echo "   ✅ Advanced Search & Filters"
echo "   ✅ Loading States & Error Handling"
echo "   ✅ Dashboard Analytics (Revenue charts)"
echo "   ✅ Export Data (CSV/Excel)"
echo "   ✅ Calendar View (Visual bookings)"
echo "   ✅ Pagination (Resort listings)"
echo "   ✅ Mobile Menu (Responsive design)"
echo "   ✅ Image Optimization (Lazy loading)"
echo "   ✅ Guest Reviews (5-star rating system)"
echo ""
echo "📝 Next Steps:"
echo "   1. Edit .env file with your credentials"
echo "   2. Configure security groups (ports 3000, 3001, 3002)"
echo "   3. Set up domain name (optional)"
echo "   4. Configure SSL certificate (optional)"
echo ""
echo "🔧 Useful Commands:"
echo "   pm2 logs          - View all logs"
echo "   pm2 restart all   - Restart all services"
echo "   pm2 stop all      - Stop all services"
echo "   pm2 monit         - Monitor services"
echo ""
echo "🎯 Your resort booking platform is ready!"