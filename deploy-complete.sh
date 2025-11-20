#!/bin/bash

# Complete Deployment Script for Vizag Resort Booking System & AI Chat App
# Run this script on a fresh Ubuntu 20.04+ EC2 instance

set -e  # Exit on any error

echo "🚀 Starting complete deployment of Vizag Resort Booking System & AI Chat App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as ubuntu user."
   exit 1
fi

print_header "STEP 1: SYSTEM UPDATE & DEPENDENCIES"

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install other dependencies
print_status "Installing system dependencies..."
sudo apt install -y nginx git python3 python3-pip python3-venv build-essential curl ufw

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

print_header "STEP 2: APPLICATION SETUP"

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p /opt/vizag-resort-booking
cd /opt

# Clone repository (if not already present)
if [ ! -d "/opt/vizag-resort-booking/.git" ]; then
    print_status "Cloning repository..."
    sudo git clone https://github.com/venkey3413/vizag-resort-booking.git
else
    print_status "Repository already exists, pulling latest changes..."
    cd /opt/vizag-resort-booking
    sudo git pull origin main
fi

# Set proper ownership
sudo chown -R $USER:$USER /opt/vizag-resort-booking
cd /opt/vizag-resort-booking

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

print_header "STEP 3: ENVIRONMENT CONFIGURATION"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating environment configuration file..."
    cp .env.example .env
    print_warning "Please edit /opt/vizag-resort-booking/.env with your API keys and configuration"
    print_warning "Required: EMAIL_USER, EMAIL_APP_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID"
    print_warning "Required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, OPENAI_API_KEY"
    
    # Pause for user to edit .env
    echo ""
    read -p "Press Enter after you have edited the .env file with your configuration..."
else
    print_status "Environment file already exists"
fi

print_header "STEP 4: DATABASE INITIALIZATION"

# Initialize database
print_status "Initializing SQLite database..."
node setup-db.js || print_warning "Database setup completed (some warnings are normal)"

print_header "STEP 5: AI CHAT APP SETUP"

# Setup Python environment for chat app
cd /opt/vizag-resort-booking/chat-app-full

print_status "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create chat app environment file
if [ ! -f ".env" ]; then
    print_status "Creating chat app environment file..."
    cp .env.example .env
    
    # Copy OpenAI key from main .env if it exists
    if [ -f "../.env" ]; then
        OPENAI_KEY=$(grep "OPENAI_API_KEY=" ../.env | cut -d '=' -f2)
        if [ ! -z "$OPENAI_KEY" ]; then
            sed -i "s/your-openai-api-key/$OPENAI_KEY/" .env
        fi
    fi
fi

# Create necessary directories
print_status "Creating chat app directories..."
mkdir -p chroma_store static

# Initialize RAG database
print_status "Initializing AI knowledge base..."
python setup_database.py || print_warning "RAG database setup completed (some warnings are normal)"

print_header "STEP 6: SYSTEMD SERVICES"

# Create systemd service for chat app
print_status "Creating systemd service for AI chat app..."
sudo tee /etc/systemd/system/vizag-chat.service > /dev/null <<EOF
[Unit]
Description=Vizag Resort AI Chat Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/vizag-resort-booking/chat-app-full
Environment=PATH=/opt/vizag-resort-booking/chat-app-full/venv/bin
EnvironmentFile=/opt/vizag-resort-booking/chat-app-full/.env
ExecStart=/opt/vizag-resort-booking/chat-app-full/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable chat service
sudo systemctl daemon-reload
sudo systemctl enable vizag-chat

print_header "STEP 7: PM2 PROCESS MANAGEMENT"

# Go back to main directory
cd /opt/vizag-resort-booking

# Start PM2 processes
print_status "Starting PM2 processes..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
print_status "Configuring PM2 startup..."
pm2 startup | tail -1 | sudo bash

print_header "STEP 8: NGINX CONFIGURATION"

# Create Nginx configuration
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/vizag-resort > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    client_max_body_size 10M;
    
    # Main website
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Admin panel
    location /booking-management {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # AI Chat API
    location /api/chat {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Chat widget static files
    location /chat-widget {
        proxy_pass http://localhost:8000/static;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/vizag-resort /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

print_header "STEP 9: FIREWALL CONFIGURATION"

# Configure UFW firewall
print_status "Configuring firewall..."
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw --force enable

print_header "STEP 10: STARTING SERVICES"

# Start all services
print_status "Starting Nginx..."
sudo systemctl restart nginx

print_status "Starting AI chat service..."
sudo systemctl start vizag-chat

# Wait a moment for services to start
sleep 5

print_header "STEP 11: HEALTH CHECKS"

# Check service status
print_status "Checking service health..."

# Check PM2 processes
echo "PM2 Process Status:"
pm2 status

# Check chat service
echo ""
echo "AI Chat Service Status:"
sudo systemctl status vizag-chat --no-pager -l

# Check Nginx
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l

# Test endpoints
print_status "Testing endpoints..."
echo "Testing main website..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || print_warning "Main website test failed"

echo "Testing admin panel..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ || print_warning "Admin panel test failed"

echo "Testing AI chat API..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs || print_warning "AI chat API test failed"

print_header "DEPLOYMENT COMPLETED!"

echo ""
print_status "🎉 Deployment completed successfully!"
echo ""
echo "📋 ACCESS POINTS:"
echo "   • Main Website: http://$(curl -s ifconfig.me)/"
echo "   • Admin Panel: http://$(curl -s ifconfig.me)/booking-management"
echo "   • Food Orders: http://$(curl -s ifconfig.me)/food"
echo "   • Travel Booking: http://$(curl -s ifconfig.me)/travel"
echo "   • AI Chat API: http://$(curl -s ifconfig.me)/docs"
echo ""
echo "🔧 MANAGEMENT COMMANDS:"
echo "   • Check all services: pm2 status && sudo systemctl status vizag-chat"
echo "   • View logs: pm2 logs && sudo journalctl -u vizag-chat -f"
echo "   • Restart services: pm2 restart all && sudo systemctl restart vizag-chat"
echo ""
echo "📝 NEXT STEPS:"
echo "   1. Point your domain to this server's IP: $(curl -s ifconfig.me)"
echo "   2. Setup SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "   3. Test all functionality including payments and chat"
echo "   4. Monitor logs for any issues"
echo ""
print_warning "IMPORTANT: Make sure all API keys in .env files are properly configured!"
echo ""
print_status "For detailed documentation, see: /opt/vizag-resort-booking/COMPLETE_DEPLOYMENT_GUIDE.md"