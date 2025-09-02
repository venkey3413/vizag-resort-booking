#!/bin/bash
# EC2 deployment script

# Update system
sudo yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone https://github.com/venkey3413/resort-booking-app.git
cd resort-booking-app

# Install dependencies
npm install

# Create uploads directory
mkdir -p uploads

# Start application with PM2
pm2 start server.js --name "resort-app"
pm2 startup
pm2 save

echo "Application deployed successfully!"
echo "Access at: http://YOUR_EC2_PUBLIC_IP:3000"