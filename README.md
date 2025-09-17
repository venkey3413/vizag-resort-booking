# Vizag Resort Booking System

A comprehensive resort booking platform for Visakhapatnam with integrated payment processing, admin management, and real-time notifications.

## 🌐 Live Application
- **Website**: https://vizagresortbooking.in
- **Admin Panel**: https://vizagresortbooking.in/booking-management

## 🏗️ Architecture Overview

### Frontend
- **HTML5/CSS3/JavaScript** - Responsive web application
- **Mobile-first design** with optimized gallery and video support
- **Real-time updates** using EventBridge integration
- **SEO optimized** with meta tags, sitemap, and Google Search Console

### Backend
- **Node.js** with Express.js framework
- **SQLite3** database for data persistence
- **RESTful APIs** for booking and payment management
- **Modular architecture** with separate services

### Infrastructure
- **AWS EC2** - Ubuntu server hosting
- **AWS Route 53** - DNS management
- **PM2** - Process management and auto-restart
- **Git/GitHub** - Version control and deployment

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3 with sqlite package
- **Process Manager**: PM2

### Payment Integration
- **UPI Payment System** with QR code generation
- **Payment verification** with UTR (12-digit) validation
- **Invoice generation** and email delivery

### Communication Services
- **Email**: Nodemailer with Gmail SMTP
- **Telegram Bot**: Real-time booking notifications
- **AWS EventBridge**: Event-driven architecture

### Frontend Features
- **Responsive Design**: Mobile-optimized interface
- **Image Gallery**: Multi-image and video support
- **Form Validation**: Client and server-side validation
- **Real-time Updates**: Auto-refresh booking status

## 📁 Project Structure

```
vizag-resort-booking/
├── server.js                 # Main application server
├── booking-server.js          # Admin booking management server
├── eventbridge-service.js     # AWS EventBridge integration
├── email-service.js           # Email notification service
├── telegram-service.js        # Telegram bot notifications
├── upi-service.js            # UPI payment processing
├── public/                   # Frontend assets
│   ├── index.html           # Main website
│   ├── style.css            # Responsive styling
│   ├── script.js            # Frontend JavaScript
│   ├── sitemap.xml          # SEO sitemap
│   └── robots.txt           # Search engine directives
├── booking-public/           # Admin panel frontend
│   ├── index.html           # Booking management interface
│   ├── style.css            # Admin panel styling
│   └── script.js            # Admin functionality
├── resort_booking.db         # SQLite database
├── .env                     # Environment variables
└── README.md                # This documentation
```

## 🗄️ Database Schema

### Resorts Table
- `id` - Primary key
- `name` - Resort name
- `location` - Resort location
- `price` - Price per night
- `description` - Resort description
- `image` - Main image URL
- `gallery` - Additional images (newline separated)
- `videos` - Video URLs (newline separated)
- `map_link` - Google Maps link
- `available` - Availability status

### Bookings Table
- `id` - Primary key
- `resort_id` - Foreign key to resorts
- `guest_name` - Customer name
- `email` - Customer email
- `phone` - Customer phone
- `check_in` - Check-in date
- `check_out` - Check-out date
- `guests` - Number of guests
- `base_price` - Base booking price
- `platform_fee` - 1.5% platform fee
- `total_price` - Total amount
- `booking_reference` - Unique booking reference
- `transaction_id` - UTR payment reference
- `payment_status` - Payment status (pending/paid)
- `status` - Booking status
- `booking_date` - Booking creation timestamp

### Payment Proofs Table
- `id` - Primary key
- `booking_id` - Foreign key to bookings
- `transaction_id` - UTR transaction ID
- `screenshot_data` - Payment screenshot (optional)
- `created_at` - Submission timestamp

## 🔧 Services Configuration

### Environment Variables (.env)
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-app-password
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-south-1
```

### PM2 Configuration
- **Main Server**: Port 3000 (public website)
- **Booking Server**: Port 3001 (admin panel)
- **Auto-restart**: Enabled for both services
- **Log management**: Separate error and output logs

## 🚀 Deployment Process

### Server Setup (Ubuntu EC2)
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup application
git clone <repository-url>
cd vizag-resort-booking
npm install

# Configure environment variables
nano .env

# Start services
pm2 start server.js --name "main-server"
pm2 start booking-server.js --name "booking-server"
pm2 startup
pm2 save
```

### Domain Configuration
- **DNS**: AWS Route 53 with A record pointing to EC2 IP
- **SSL**: Let's Encrypt certificate (recommended)
- **Firewall**: Allow ports 80, 443, 3000, 3001

## 📱 Features

### Customer Features
- **Resort Browsing**: View available resorts with images/videos
- **Booking System**: Date selection with availability checking
- **Payment Integration**: UPI QR code with UTR verification
- **Email Notifications**: Booking confirmation and invoices
- **Mobile Responsive**: Optimized for all device sizes
- **Gallery**: Image and video gallery with mobile controls

### Admin Features
- **Booking Management**: View and manage all bookings
- **Payment Verification**: Mark payments as verified
- **Email System**: Send invoices manually
- **Real-time Updates**: Auto-refresh booking status
- **Database Backup**: Automatic backup on payment confirmation

### Notification System
- **Telegram Integration**: Real-time booking notifications
- **Email Automation**: Automated invoice generation
- **EventBridge Events**: Decoupled event processing

## 🔒 Security Features

- **Environment Variables**: Sensitive data protection
- **Input Validation**: Server and client-side validation
- **Rate Limiting**: Booking limits per email/phone
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Cross-origin request handling

## 📊 SEO & Analytics

- **Google Search Console**: Domain verification and sitemap
- **Meta Tags**: Comprehensive SEO optimization
- **Local Keywords**: Vizag-specific location targeting
- **Structured Data**: Search engine friendly markup
- **Mobile Optimization**: Mobile-first indexing ready

## 🔄 Maintenance

### Regular Tasks
- **Database Backup**: Automated on each paid booking
- **Log Monitoring**: PM2 log management
- **Security Updates**: Regular dependency updates
- **Performance Monitoring**: Server resource monitoring

### Troubleshooting
- **PM2 Status**: `pm2 status` - Check service health
- **Logs**: `pm2 logs` - View application logs
- **Restart**: `pm2 restart all` - Restart services
- **Database**: SQLite browser for database inspection

## 📞 Support

For technical support or feature requests, contact the development team.

---

**Built with ❤️ for Vizag Tourism**