# Vizag Resort Booking System - Complete API Documentation

## Server Architecture

### 1. Main Server (Port 3000)
Customer-facing website with resort booking, food ordering, and travel packages.

### 2. Admin Server (Port 3001)
Admin panel for managing resorts, events, bookings, and system configuration.

### 3. Booking Management Server (Port 3002)
Handles booking confirmations, cancellations, and payment processing.

### 4. Centralized Database API (Port 3003)
Core database operations shared across all services.

---

## 🏨 RESORTS API

### Get All Resorts
```
GET /api/resorts
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Beach Resort",
    "location": "Vizag Beach",
    "price": 2500,
    "description": "Beautiful beachfront resort",
    "image": "/images/resort.jpg",
    "gallery": "image1.jpg,image2.jpg",
    "videos": "video1.mp4",
    "map_link": "https://maps.google.com/...",
    "amenities": "WiFi,Pool,AC",
    "note": "Check-in after 2 PM",
    "max_guests": 6,
    "sort_order": 0,
    "available": 1,
    "dynamic_pricing": [
      { "day_type": "weekday", "price": 2000 },
      { "day_type": "weekend", "price": 3000 }
    ]
  }
]
```

### Get Single Resort
```
GET /api/resorts/:id
```

### Create Resort
```
POST /api/resorts
```
**Body:**
```json
{
  "name": "New Resort",
  "location": "Vizag",
  "price": 2500,
  "description": "Description",
  "image": "/images/resort.jpg",
  "gallery": "img1.jpg,img2.jpg",
  "videos": "video.mp4",
  "map_link": "https://maps.google.com",
  "amenities": "WiFi,Pool"
}
```

### Update Resort
```
PUT /api/resorts/:id
```
**Body:** Same as Create Resort + `available` field

### Delete Resort
```
DELETE /api/resorts/:id
```

---

## 📅 BOOKINGS API

### Get All Bookings
```
GET /api/bookings
```
**Response:**
```json
[
  {
    "id": 1,
    "resort_id": 1,
    "resort_name": "Beach Resort",
    "guest_name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "check_in": "2024-01-15",
    "check_out": "2024-01-16",
    "guests": 2,
    "total_price": 2500,
    "booking_reference": "VE000001234567",
    "transaction_id": "UTR123456",
    "coupon_code": "SAVE10",
    "discount_amount": 250,
    "status": "confirmed",
    "payment_status": "paid",
    "booking_date": "2024-01-10T10:30:00"
  }
]
```

### Create Booking
```
POST /api/bookings
```
**Body:**
```json
{
  "resortId": 1,
  "guestName": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-16",
  "guests": 2,
  "totalPrice": 2500,
  "transactionId": "UTR123456",
  "couponCode": "SAVE10",
  "discountAmount": 250
}
```

### Check Availability
```
POST /api/check-availability
```
**Body:**
```json
{
  "resortId": 1,
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-16",
  "expectedPrice": 2500
}
```

### Confirm Booking (Admin)
```
POST /api/bookings/:id/confirm
```
**Response:**
```json
{
  "success": true,
  "emailSent": true,
  "whatsappUrl": "https://wa.me/919876543210?text=..."
}
```

### Cancel Booking (Admin)
```
POST /api/bookings/:id/cancel
```

### Send Booking Email
```
POST /api/bookings/:id/send-email
```

### Delete Booking
```
DELETE /api/bookings/:id
```

---

## 🎉 EVENTS API

### Get All Events
```
GET /api/events
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Beach Party",
    "location": "Vizag Beach",
    "price": 5000,
    "event_type": "party",
    "description": "Fun beach party",
    "image": "/images/event.jpg",
    "gallery": "img1.jpg,img2.jpg",
    "videos": "video.mp4",
    "map_link": "https://maps.google.com",
    "amenities": "DJ,Food,Drinks",
    "note": "Minimum 20 guests",
    "max_guests": 100,
    "slot_timings": "10:00 AM,2:00 PM,6:00 PM",
    "sort_order": 0,
    "available": 1,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### Create Event
```
POST /api/events
```
**Body:**
```json
{
  "name": "Beach Party",
  "location": "Vizag Beach",
  "price": 5000,
  "event_type": "party",
  "description": "Fun beach party",
  "image": "/images/event.jpg",
  "gallery": "img1.jpg,img2.jpg",
  "videos": "video.mp4",
  "map_link": "https://maps.google.com",
  "amenities": "DJ,Food,Drinks",
  "note": "Minimum 20 guests",
  "max_guests": 100,
  "slot_timings": "10:00 AM,2:00 PM,6:00 PM",
  "sort_order": 0
}
```

### Update Event
```
PUT /api/events/:id
```

### Delete Event
```
DELETE /api/events/:id
```

### Reorder Events
```
POST /api/events/reorder
```
**Body:**
```json
{
  "eventOrders": [
    { "id": 1, "sort_order": 0 },
    { "id": 2, "sort_order": 1 }
  ]
}
```

---

## 🎊 EVENT BOOKINGS API

### Get All Event Bookings
```
GET /api/event-bookings
```
**Response:**
```json
[
  {
    "id": 1,
    "booking_reference": "VE000001234567",
    "event_id": 1,
    "event_name": "Beach Party",
    "guest_name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "event_date": "2024-01-15",
    "event_time": "6:00 PM",
    "guests": 50,
    "total_price": 5000,
    "transaction_id": "UTR123456",
    "payment_method": "upi",
    "status": "pending",
    "created_at": "2024-01-10T10:30:00"
  }
]
```

### Create Event Booking
```
POST /api/event-bookings
```
**Body:**
```json
{
  "bookingReference": "VE000001234567",
  "eventId": 1,
  "eventName": "Beach Party",
  "guestName": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "eventDate": "2024-01-15",
  "eventTime": "6:00 PM",
  "guests": 50,
  "totalPrice": 5000,
  "transactionId": "UTR123456",
  "paymentMethod": "upi"
}
```

### Confirm Event Booking
```
POST /api/event-bookings/:id/confirm
```

### Cancel Event Booking
```
POST /api/event-bookings/:id/cancel
```

### Delete Event Booking
```
DELETE /api/event-bookings/:id
```

---

## 💰 DYNAMIC PRICING API

### Get Resort Pricing
```
GET /api/dynamic-pricing/:resortId
```
**Response:**
```json
[
  { "id": 1, "resort_id": 1, "day_type": "weekday", "price": 2000 },
  { "id": 2, "resort_id": 1, "day_type": "weekend", "price": 3000 }
]
```

### Update Dynamic Pricing
```
POST /api/dynamic-pricing
```
**Body:**
```json
{
  "resortId": 1,
  "weekdayPrice": 2000,
  "fridayPrice": 2500,
  "weekendPrice": 3000
}
```

---

## 🎟️ COUPONS API

### Get All Coupons
```
GET /api/coupons
GET /api/coupons?resortId=1
```
**Response:**
```json
[
  {
    "code": "SAVE10",
    "type": "percentage",
    "discount": 10,
    "day_type": "all",
    "resort_id": null,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### Create Coupon
```
POST /api/coupons
```
**Body:**
```json
{
  "code": "SAVE10",
  "type": "percentage",
  "discount": 10,
  "day_type": "all",
  "resort_id": null
}
```

### Delete Coupon
```
DELETE /api/coupons/:code
```

---

## 🚫 BLOCKED DATES API

### Get Blocked Dates
```
GET /api/blocked-dates/:resortId
```
**Response:**
```json
["2024-01-15", "2024-01-20", "2024-02-01"]
```

### Block Date
```
POST /api/blocked-dates
```
**Body:**
```json
{
  "resortId": 1,
  "blockDate": "2024-01-15",
  "reason": "Maintenance"
}
```

### Unblock Date
```
DELETE /api/blocked-dates/:resortId/:blockDate
```

---

## 👤 OWNERS API

### Get All Owners
```
GET /api/owners
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Owner Name",
    "email": "owner@example.com",
    "phone": "+919876543210",
    "resort_ids": "1,2,3",
    "resort_names": "Resort 1,Resort 2,Resort 3",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### Create Owner
```
POST /api/owners
```
**Body:**
```json
{
  "name": "Owner Name",
  "email": "owner@example.com",
  "phone": "+919876543210",
  "password": "password123",
  "resortId": 1
}
```

### Delete Owner
```
DELETE /api/owners/:id
```

### Owner Login
```
POST /api/owner-login
```
**Body:**
```json
{
  "email": "owner@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "owner": {
    "id": 1,
    "name": "Owner Name",
    "email": "owner@example.com",
    "phone": "+919876543210"
  },
  "resorts": [
    { "id": 1, "name": "Beach Resort", "location": "Vizag Beach" }
  ],
  "bookings": [...],
  "stats": {
    "totalBookings": 50,
    "pendingBookings": 5,
    "confirmedBookings": 45
  }
}
```

---

## 📧 EMAIL & NOTIFICATIONS API

### Send Email OTP
```
POST /api/send-email-otp
```
**Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

---

## 💳 PAYMENT API

### Get Razorpay Key
```
GET /api/razorpay-key
```
**Response:**
```json
{
  "key": "rzp_live_xxxxx"
}
```

### Razorpay Webhook
```
POST /api/razorpay-webhook
```
**Headers:**
```
x-razorpay-signature: <signature>
```
**Body:** Razorpay webhook payload

---

## 📡 REAL-TIME EVENTS (Server-Sent Events)

### Subscribe to Events
```
GET /api/events-stream
```
**Response:** Server-Sent Events stream

**Event Types:**
- `booking.created` - New booking created
- `booking.updated` - Booking status changed
- `booking.deleted` - Booking deleted
- `resort.created` - New resort added
- `resort.updated` - Resort details updated
- `resort.deleted` - Resort removed
- `resort.pricing.updated` - Dynamic pricing changed
- `resort.date.blocked` - Date blocked
- `resort.date.unblocked` - Date unblocked
- `event.created` - New event added
- `event.updated` - Event details updated
- `event.deleted` - Event removed
- `event.booking.created` - New event booking
- `event.booking.confirmed` - Event booking confirmed
- `event.booking.cancelled` - Event booking cancelled

---

## 🍽️ FOOD ORDERS API (Coming Soon)

### Get Food Orders
```
GET /api/food-orders
```

### Create Food Order
```
POST /api/food-orders
```

---

## 🚗 TRAVEL BOOKINGS API (Coming Soon)

### Get Travel Bookings
```
GET /api/travel-bookings
```

### Create Travel Booking
```
POST /api/travel-bookings
```

---

## 💬 CHAT API (Coming Soon)

### Get Chat Sessions
```
GET /api/chat-sessions
```

### Get Chat Messages
```
GET /api/chat-messages/:sessionId
```

---

## 🏥 HEALTH CHECK

### Check Server Health
```
GET /health
```
**Response:**
```json
{
  "status": "OK",
  "port": 3003,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "bookings": 50,
  "resorts": 10
}
```

---

## 🔐 Authentication & Security

### Headers
All requests should include:
```
Content-Type: application/json
```

### CORS
- Production: `https://vshakago.in`
- Development: All origins allowed

### Security Headers
- `Cache-Control: no-cache, no-store, must-revalidate`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## 🔄 Redis Pub/Sub Channels

### Channels
- `booking-events` - Resort bookings
- `resort-events` - Resort updates
- `event-events` - Event updates
- `food-events` - Food orders
- `travel-events` - Travel bookings

---

## 🌐 Environment Variables

```env
# Database
DB_API_URL=http://localhost:3003

# Booking Service
BOOKING_API_URL=http://localhost:3002

# Main Service
MAIN_API_URL=http://localhost:3000

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📝 Notes

1. All dates are in `YYYY-MM-DD` format
2. All timestamps are in ISO 8601 format
3. Phone numbers must be in `+91XXXXXXXXXX` format
4. Booking references follow pattern `VE{timestamp}`
5. Prices are in Indian Rupees (₹)
6. Platform fee is 1.5% of base price
7. Maximum 2 unpaid bookings allowed per date per resort
8. Only 1 paid booking allowed per date per resort

---

## 🚀 Quick Start

### Start All Services
```bash
# Terminal 1 - Database API
node centralized-db-api.js

# Terminal 2 - Main Server
node server.js

# Terminal 3 - Admin Server
node admin-server.js

# Terminal 4 - Booking Server
node booking-server.js
```

### Access Points
- Main Website: http://localhost:3000
- Admin Panel: http://localhost:3001
- Booking Management: http://localhost:3002
- Database API: http://localhost:3003

---

## 📞 Support

For API support, contact: vizagresortbooking@gmail.com
