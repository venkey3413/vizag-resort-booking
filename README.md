# Vizag Resort Booking System

A streamlined resort booking management system with integrated food and travel services.

## Core Services

### 1. Main Server (Port 3000)
- **Resort Booking System** - Complete resort reservation platform
- **Food Ordering Service** - Pre-order meals for resort stays
- **Travel Packages** - Local sightseeing and tour bookings
- **Owner Dashboard** - Resort owner management interface

### 2. Admin Server (Port 3001) 
- Admin panel for managing all services
- Resort, food items, and travel package management
- Real-time updates and notifications

### 3. Booking Management Server (Port 3002)
- Centralized booking verification and processing
- Payment status management
- Email notifications and invoicing
- Database operations and backups

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