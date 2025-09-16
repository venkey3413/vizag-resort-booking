// UPI Payment Service
const UPI_ID = 'vizagresorts@ybl';

// Generate UPI payment URL
function generateUPIUrl(amount, bookingId, guestName) {
    const params = new URLSearchParams({
        pa: UPI_ID,
        pn: 'Vizag Resorts',
        am: amount.toString(),
        cu: 'INR',
        tn: `Booking ${bookingId} - ${guestName}`,
        tr: `VR${bookingId}${Date.now()}`
    });
    
    return `upi://pay?${params.toString()}`;
}

// Use fixed QR code image
function generateQRCodeUrl(upiUrl) {
    return 'qr-code.png'; // Fixed QR code image
}

// Generate payment details
function generatePaymentDetails(amount, bookingId, guestName) {
    const upiUrl = generateUPIUrl(amount, bookingId, guestName);
    const qrCodeUrl = generateQRCodeUrl(upiUrl);
    
    return {
        upiId: UPI_ID,
        amount: amount,
        bookingReference: `VR${bookingId}`,
        upiUrl: upiUrl,
        qrCodeUrl: qrCodeUrl,
        instructions: [
            '1. Scan the QR code with any UPI app',
            '2. Verify amount and booking details',
            '3. Complete payment',
            '4. Upload payment screenshot below',
            '5. Your booking will be confirmed instantly'
        ]
    };
}

module.exports = {
    generatePaymentDetails,
    UPI_ID
};