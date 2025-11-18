# Vizag Resort Chat App - Quick Deployment Guide

## Files Pushed to Repository

### Chat App (Full AI Features)
- `chat-app-full/` - Complete AI-powered chat application
- `chat-app-full/Dockerfile` - Docker container configuration
- `chat-app-full/docker-compose.yml` - Multi-container setup
- `chat-app-full/requirements.txt` - Python dependencies
- `chat-app-full/.env.example` - Environment variables template
- `chat-app-full/setup_database.py` - Database initialization
- `chat-app-full/local-dev.bat` - Windows development script

### Deployment Files
- `nginx-chat.conf` - Nginx reverse proxy configuration
- `chat-widget-integration.html` - Website integration code

## Quick EC2 Deployment

### 1. Launch EC2 Instance
```bash
# Ubuntu 20.04 LTS, t3.small, Security Groups: 22,80,443,8000
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker

sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Deploy Application
```bash
git clone https://github.com/venkey3413/vizag-resort-booking.git
cd vizag-resort-booking/chat-app-full

cp .env.example .env
nano .env  # Add your OpenAI API key

python3 setup_database.py
docker-compose up -d --build
```

### 4. Configure Domain
```bash
# Add DNS: chat.vizagresortbooking.in → EC2-IP
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp ../nginx-chat.conf /etc/nginx/sites-available/chat.vizagresortbooking.in
sudo ln -s /etc/nginx/sites-available/chat.vizagresortbooking.in /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d chat.vizagresortbooking.in
```

### 5. Add to Website
Copy code from `chat-widget-integration.html` to your main website before `</body>` tag.

## Access Points
- **Chat App**: https://chat.vizagresortbooking.in
- **Widget**: https://chat.vizagresortbooking.in/static/chat-widget.html
- **API Docs**: https://chat.vizagresortbooking.in/docs

## Management Commands
```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Update
git pull && docker-compose up -d --build
```