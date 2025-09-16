#!/bin/bash

echo "🚀 Starting Vizag Resort Booking Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Git if not installed
if ! command -v git &> /dev/null; then
    echo "📥 Installing Git..."
    sudo apt install git -y
fi

# Clone or update repository
if [ -d "vizag-resort-booking" ]; then
    echo "🔄 Updating existing repository..."
    cd vizag-resort-booking
    git pull
else
    echo "📥 Cloning repository..."
    git clone https://github.com/venkey3413/vizag-resort-booking.git
    cd vizag-resort-booking
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Kill existing processes
echo "🛑 Stopping existing services..."
sudo pkill -f node || true
sudo lsof -ti:3000,3001,3002,3003 | xargs sudo kill -9 2>/dev/null || true

# Wait for ports to be free
sleep 3

# Start all services
echo "🚀 Starting all services..."
npm run dev &

# Wait for services to start
sleep 5

# Check if services are running
echo "✅ Checking service status..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Main site (3000) - Running"
else
    echo "❌ Main site (3000) - Failed"
fi

if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Admin panel (3001) - Running"
else
    echo "❌ Admin panel (3001) - Failed"
fi

if curl -s http://localhost:3002 > /dev/null; then
    echo "✅ Booking management (3002) - Running"
else
    echo "❌ Booking management (3002) - Failed"
fi

if curl -s http://localhost:3003 > /dev/null; then
    echo "✅ WebSocket server (3003) - Running"
else
    echo "❌ WebSocket server (3003) - Failed"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "📱 Access your services:"
echo "   Main Site: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "   Admin Panel: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001"
echo "   Booking Management: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3002"
echo ""
echo "💡 To stop services: sudo pkill -f node"
echo "💡 To restart: npm run dev"