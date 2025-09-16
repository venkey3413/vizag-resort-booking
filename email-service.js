const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function sendInvoiceEmail(booking) {
    try {
        const invoiceHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #27ae60;">Vizag Resorts</h1>
                    <h2 style="color: #333;">Booking Confirmation & Invoice</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #27ae60; margin-bottom: 15px;">Dear ${booking.guest_name},</h3>
                    <p>Your payment has been verified and your booking is now confirmed!</p>
                </div>
                
                <div style="border: 1px solid #eee; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #333; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">Booking Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold;">Booking ID:</td><td>${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold;">Resort:</td><td>${booking.resort_name}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold;">Check-in:</td><td>${new Date(booking.check_in).toLocaleDateString()} (11:00 AM)</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold;">Check-out:</td><td>${new Date(booking.check_out).toLocaleDateString()} (9:00 AM)</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold;">Guests:</td><td>${booking.guests}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="color: #27ae60; font-weight: bold;">₹${booking.total_price.toLocaleString()}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold;">Payment Status:</td><td style="color: #27ae60; font-weight: bold;">PAID</td></tr>
                    </table>
                </div>
                
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #27ae60; margin-bottom: 10px;">Important Information:</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Check-in time: 11:00 AM</li>
                        <li>Check-out time: 9:00 AM</li>
                        <li>Please carry a valid ID proof</li>
                        <li>Contact us for any special requirements</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #666;">Thank you for choosing Vizag Resorts!</p>
                    <p style="color: #666;">For any queries, contact us at info@vizagresorts.com or +91 9876543210</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.email,
            subject: `Booking Confirmed - ${booking.resort_name} | Vizag Resorts`,
            html: invoiceHTML
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Invoice email sent to ${booking.email}`);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}

module.exports = { sendInvoiceEmail };