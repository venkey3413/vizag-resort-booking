# Vizag Resort Booking System

A complete resort booking management system with three separate services.

## Services

### 1. Main Server (Port 3000)
- Public website and booking system
- Food ordering service
- Travel packages
- Owner dashboard

### 2. Admin Server (Port 3001) 
- Admin panel for managing resorts
- Food items management
- Travel packages management
- Real-time updates

### 3. Booking Server (Port 3002)
- Booking management and verification
- Payment processing
- Email notifications
- Database operations

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start all services:
```bash
npm start
```

## Direct Access URLs

- Main Website: `http://YOUR_SERVER_IP:3000`
- Admin Panel: `http://YOUR_SERVER_IP:3001`
- Booking Management: `http://YOUR_SERVER_IP:3002`

## Database

Uses SQLite database (`resort_booking.db`) shared across all services.

## Features

- Resort booking with dynamic pricing
- Food ordering system
- Travel package bookings
- Payment verification
- Email notifications
- Telegram notifications
- Owner dashboard for resort management
- Admin panel for complete system management