# Update AWS EC2 with Latest Git Changes

## 🔄 Quick Update Steps

### 1. Connect to EC2
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### 2. Navigate to Project Directory
```bash
cd ap-resort-booking
```

### 3. Pull Latest Changes
```bash
git pull origin main
```

### 4. Install New Dependencies (if any)
```bash
npm install
```

### 5. Restart Services
```bash
# Stop existing processes
pm2 stop all

# Start all microservices
pm2 start ecosystem.config.js
pm2 start admin-server.js --name "admin-panel"
pm2 start booking-server.js --name "booking-service"

# Save PM2 configuration
pm2 save
```

### 6. Check Status
```bash
pm2 status
pm2 logs
```

## 🚀 One-Command Update Script

Create update script on EC2:
```bash
nano update.sh
```

Add this content:
```bash
#!/bin/bash
echo "🔄 Updating Resort Booking App..."
git pull origin main
npm install
pm2 restart all
echo "✅ Update completed!"
```

Make executable and run:
```bash
chmod +x update.sh
./update.sh
```

## 🌐 Access Updated Services
- Main App: `http://your-ec2-ip:3000`
- Admin Panel: `http://your-ec2-ip:3001`
- Booking Service: `http://your-ec2-ip:3002`

## 🔧 Troubleshooting
```bash
# Check if services are running
pm2 status

# View logs
pm2 logs resort-booking
pm2 logs admin-panel
pm2 logs booking-service

# Restart specific service
pm2 restart resort-booking
```