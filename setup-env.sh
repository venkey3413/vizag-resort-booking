#!/bin/bash

# Environment Setup Script for Vizag Resort Booking System
# This script helps you configure all required API keys and settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to prompt for input with default value
prompt_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$var_name=\"\${input:-$default}\""
    else
        read -p "$prompt: " input
        eval "$var_name=\"$input\""
    fi
}

# Function to prompt for sensitive input (hidden)
prompt_secret() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " input
    echo ""
    eval "$var_name=\"$input\""
}

print_header "VIZAG RESORT BOOKING - ENVIRONMENT SETUP"

echo "This script will help you configure all required API keys and settings."
echo "You can skip any section by pressing Enter without input."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    print_warning ".env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        print_status "Exiting without changes."
        exit 0
    fi
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Backed up existing .env file"
fi

print_header "EMAIL CONFIGURATION (Gmail)"
echo "Required for sending booking confirmations and invoices."
echo "You need to enable 2FA and create an App Password in Gmail."
echo ""

prompt_input "Gmail address" "" EMAIL_USER
if [ -n "$EMAIL_USER" ]; then
    prompt_secret "Gmail App Password (16 characters)" EMAIL_APP_PASSWORD
fi

print_header "TELEGRAM NOTIFICATIONS"
echo "Required for real-time booking notifications."
echo "Create a bot via @BotFather and get your chat ID from @userinfobot"
echo ""

prompt_input "Telegram Bot Token" "" TELEGRAM_BOT_TOKEN
prompt_input "Telegram Chat ID" "" TELEGRAM_CHAT_ID

print_header "PAYMENT GATEWAY (Razorpay)"
echo "Required for processing payments."
echo "Get these from your Razorpay dashboard."
echo ""

prompt_input "Razorpay Key ID" "rzp_test_RJPlUWvOmXa5kb" RAZORPAY_KEY_ID
if [ -n "$RAZORPAY_KEY_ID" ]; then
    prompt_secret "Razorpay Key Secret" RAZORPAY_KEY_SECRET
fi

print_header "AI CHAT SERVICE (OpenAI)"
echo "Required for the AI chat functionality."
echo "Get your API key from https://platform.openai.com/api-keys"
echo ""

prompt_secret "OpenAI API Key" OPENAI_API_KEY

print_header "AWS CONFIGURATION (Optional)"
echo "Required for S3 backups and EventBridge (optional features)."
echo ""

prompt_input "AWS Region" "ap-south-1" AWS_REGION
prompt_input "AWS Access Key ID" "" AWS_ACCESS_KEY_ID
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    prompt_secret "AWS Secret Access Key" AWS_SECRET_ACCESS_KEY
fi

print_header "DOMAIN CONFIGURATION"
echo "Your domain name for production deployment."
echo ""

prompt_input "Domain name (e.g., vizagresortbooking.in)" "" DOMAIN_NAME

# Generate .env file
print_status "Generating .env file..."

cat > .env << EOF
# Email Configuration
EMAIL_USER=${EMAIL_USER:-your-email@gmail.com}
EMAIL_APP_PASSWORD=${EMAIL_APP_PASSWORD:-your-app-password}

# Telegram Configuration
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-your-telegram-bot-token}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-your-telegram-chat-id}

# AWS Configuration
AWS_REGION=${AWS_REGION:-ap-south-1}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-your-access-key}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-your-secret-key}

# Razorpay Configuration
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID:-rzp_test_RJPlUWvOmXa5kb}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET:-your-razorpay-secret}

# OpenAI Configuration (required for AI chat service)
OPENAI_API_KEY=${OPENAI_API_KEY:-your-openai-api-key-here}

# Production Environment
NODE_ENV=production
DOMAIN=${DOMAIN_NAME:-localhost}

# EventBridge Real-time Sync (optional)
EVENTBRIDGE_QUEUE_URL=https://sqs.${AWS_REGION:-ap-south-1}.amazonaws.com/your-account/vizag-resort-events-queue
EOF

# Also create chat app .env
if [ -d "chat-app-full" ]; then
    print_status "Generating chat app .env file..."
    
    cat > chat-app-full/.env << EOF
# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY:-your-openai-api-key-here}

# Database Configuration
DATABASE_URL=sqlite:///./app.db
RAG_DB_DIR=chroma_store

# CORS Origins
CORS_ORIGINS=https://${DOMAIN_NAME:-localhost},https://www.${DOMAIN_NAME:-localhost},http://localhost:3000
EOF
fi

print_header "CONFIGURATION COMPLETE!"

echo ""
print_status "✅ Environment files created successfully!"
echo ""
echo "📁 Files created:"
echo "   • .env (main application)"
if [ -d "chat-app-full" ]; then
    echo "   • chat-app-full/.env (AI chat service)"
fi
echo ""

# Validate configuration
print_status "🔍 Configuration validation:"

# Check required fields
missing_config=false

if [[ "$EMAIL_USER" == "your-email@gmail.com" || -z "$EMAIL_USER" ]]; then
    print_warning "Email configuration is not set - email notifications will not work"
    missing_config=true
fi

if [[ "$TELEGRAM_BOT_TOKEN" == "your-telegram-bot-token" || -z "$TELEGRAM_BOT_TOKEN" ]]; then
    print_warning "Telegram configuration is not set - notifications will not work"
    missing_config=true
fi

if [[ "$RAZORPAY_KEY_ID" == "rzp_test_RJPlUWvOmXa5kb" ]]; then
    print_warning "Using test Razorpay keys - remember to update for production"
fi

if [[ "$OPENAI_API_KEY" == "your-openai-api-key-here" || -z "$OPENAI_API_KEY" ]]; then
    print_warning "OpenAI API key is not set - AI chat will not work"
    missing_config=true
fi

if [ "$missing_config" = true ]; then
    echo ""
    print_warning "Some configurations are missing. You can update them later by editing the .env files."
else
    echo ""
    print_status "🎉 All configurations look good!"
fi

echo ""
echo "📝 NEXT STEPS:"
echo "   1. Run the deployment script: ./deploy-complete.sh"
echo "   2. Or manually start services: npm start"
echo "   3. Test your configuration with the provided endpoints"
echo ""
echo "📖 For detailed setup instructions, see: COMPLETE_DEPLOYMENT_GUIDE.md"
echo ""

# Make files readable only by owner for security
chmod 600 .env
if [ -f "chat-app-full/.env" ]; then
    chmod 600 chat-app-full/.env
fi

print_status "Environment setup completed!"