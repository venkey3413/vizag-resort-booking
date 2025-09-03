#!/bin/bash

# Resort Booking App Deployment Script for AWS EC2

echo "🚀 Starting AWS EC2 deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo "📦 Installing app dependencies..."
npm install

# Create uploads directory
mkdir -p uploads

# Stop existing PM2 process if running
pm2 stop resort-booking 2>/dev/null || true

# Start application with PM2
echo "🌟 Starting Resort Booking App with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ Deployment completed!"
echo "🌐 Access your app at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"