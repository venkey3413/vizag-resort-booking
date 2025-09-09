# Payment Integration Guide

## Overview
Secure Razorpay payment gateway integration with comprehensive security measures.

## Security Features Implemented

### 1. Payment Security
- **PCI DSS Compliant**: Using Razorpay's secure payment processing
- **Server-side Verification**: All payments verified on server before booking creation
- **CSRF Protection**: All payment endpoints protected with CSRF tokens
- **Input Validation**: Comprehensive validation of all payment and booking data
- **Signature Verification**: Cryptographic verification of payment signatures

### 2. Data Protection
- **No Card Data Storage**: Card details never touch your servers
- **Encrypted Communication**: All payment data encrypted in transit
- **Secure Headers**: Proper security headers for payment pages
- **Rate Limiting**: Protection against payment abuse

### 3. Booking Security
- **Atomic Transactions**: Payment and booking created atomically
- **Duplicate Prevention**: Order IDs prevent duplicate payments
- **Amount Verification**: Server verifies payment amount matches booking cost
- **Status Tracking**: Complete payment lifecycle tracking

## Setup Instructions

### 1. Install Dependencies
```bash
npm install razorpay csurf jsonwebtoken crypto
```

### 2. Environment Configuration
Create `.env` file with:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Razorpay Account Setup
1. Sign up at https://razorpay.com
2. Complete KYC verification
3. Get API keys from Dashboard > Settings > API Keys
4. Configure webhooks (optional)

## API Endpoints

### Create Payment Order
```
POST /api/payment/create-order
Content-Type: application/json
X-CSRF-Token: <token>

{
  "amount": 5000,
  "bookingData": {
    "resortId": 1,
    "guestName": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "checkIn": "2024-01-15",
    "checkOut": "2024-01-17",
    "guests": 2
  }
}
```

### Verify Payment and Create Booking
```
POST /api/payment/verify-and-book
Content-Type: application/json
X-CSRF-Token: <token>

{
  "paymentId": "pay_xxxxx",
  "orderId": "order_xxxxx",
  "signature": "signature_xxxxx",
  "bookingData": { ... }
}
```

## Frontend Integration

### 1. Load Razorpay Script
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Initialize Payment
```javascript
const options = {
  key: 'rzp_test_xxxxx',
  amount: 500000, // Amount in paise
  currency: 'INR',
  name: 'Vizag Resort Booking',
  description: 'Resort Booking Payment',
  order_id: 'order_xxxxx',
  handler: function(response) {
    // Verify payment on server
    verifyPaymentAndBook(response, bookingData);
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

## Security Best Practices

### 1. Server-side Validation
- Always validate payment signatures on server
- Verify payment amount matches booking cost
- Check payment status before creating booking

### 2. Error Handling
- Never expose sensitive payment errors to frontend
- Log all payment failures for monitoring
- Provide user-friendly error messages

### 3. Monitoring
- Monitor failed payments and suspicious activity
- Set up alerts for payment anomalies
- Regular security audits of payment flow

## Testing

### Test Cards (Razorpay Test Mode)
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### Test Flow
1. Create test booking with test amount
2. Use test card details
3. Verify booking creation
4. Check payment status in Razorpay dashboard

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Enable webhook signatures
- [ ] Set up payment monitoring
- [ ] Configure proper error logging
- [ ] Test with real bank accounts
- [ ] Verify tax calculations
- [ ] Set up refund process

## Compliance Notes

- **PCI DSS**: Razorpay handles PCI compliance
- **Data Privacy**: No card data stored locally
- **Audit Trail**: All transactions logged
- **Refunds**: Handled through Razorpay dashboard
- **Disputes**: Managed via Razorpay merchant portal