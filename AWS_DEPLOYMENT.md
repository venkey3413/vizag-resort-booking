# AWS EC2 Deployment Guide

## 🚀 Step-by-Step Deployment

### 1. Launch EC2 Instance
- Go to AWS Console → EC2
- Click "Launch Instance"
- Choose **Ubuntu Server 22.04 LTS**
- Instance type: **t2.micro** (free tier)
- Create new key pair (download .pem file)
- Security Group: Allow HTTP (80), HTTPS (443), SSH (22), Custom TCP (3000)
- Launch instance

### 2. Connect to EC2
```bash
# Windows (use Git Bash or WSL)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Make key file secure
chmod 400 your-key.pem
```

### 3. Install Dependencies on EC2
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 4. Clone and Setup Application
```bash
# Clone your repository
git clone https://github.com/venkey3413/ap-resort-booking.git
cd ap-resort-booking

# Install dependencies
npm install

# Create uploads directory
mkdir -p uploads
```

### 5. Start Application with PM2
```bash
# Start app with PM2
pm2 start server.js --name "resort-booking"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### 6. Setup Nginx (Optional - for production)
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/resort-booking
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name your-domain.com your-ec2-public-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/resort-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Access Your Website
- **Direct:** `http://your-ec2-public-ip:3000`
- **With Nginx:** `http://your-ec2-public-ip`

## 🔧 Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs resort-booking

# Restart app
pm2 restart resort-booking

# Update app
git pull
npm install
pm2 restart resort-booking
```

## 🔒 Security Group Settings
- **SSH (22):** Your IP only
- **HTTP (80):** 0.0.0.0/0
- **HTTPS (443):** 0.0.0.0/0
- **Custom TCP (3000):** 0.0.0.0/0

## 💡 Production Tips
- Use Elastic IP for static IP
- Setup SSL with Let's Encrypt
- Use RDS for database
- Setup CloudWatch monitoring
- Configure auto-scaling