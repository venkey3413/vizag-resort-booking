const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'vizagresortbooking@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function sendBookingConfirmation(booking, resort) {
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .booking-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .label { font-weight: bold; color: #333; }
            .value { color: #666; }
            .total { background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .payment-btn { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏨 Booking Confirmation</h1>
                <h2>Booking ID: ${booking.bookingReference}</h2>
            </div>
            
            <div class="content">
                <p>Dear <strong>${booking.guestName}</strong>,</p>
                <p>Thank you for choosing our resort! Your booking has been confirmed.</p>
                
                <div class="booking-details">
                    <h3>📋 Booking Details</h3>
                    <div class="detail-row">
                        <span class="label">Resort:</span>
                        <span class="value">${resort.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Location:</span>
                        <span class="value">${resort.location}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Check-in:</span>
                        <span class="value">${new Date(booking.checkIn).toLocaleDateString()} at 11:00 AM</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Check-out:</span>
                        <span class="value">${new Date(booking.checkOut).toLocaleDateString()} at 9:00 AM</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Guests:</span>
                        <span class="value">${booking.guests}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Phone:</span>
                        <span class="value">${booking.phone}</span>
                    </div>
                </div>
                
                <div class="total">
                    <h3>💰 Total Amount: ₹${booking.totalPrice.toLocaleString()}</h3>
                </div>
                
                <div style="text-align: center;">
                    <a href="https://wa.me/918341674465?text=Hi,%20I%20want%20to%20make%20payment%20for%20booking%20${booking.bookingReference}" class="payment-btn">
                        💳 Pay Now via WhatsApp
                    </a>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>📝 Important Notes:</h4>
                    <ul>
                        <li>Please arrive by 11:00 AM on your check-in date</li>
                        <li>Check-out is at 9:00 AM on your departure date</li>
                        <li>Payment can be made at the resort or via WhatsApp</li>
                        <li>Contact us for any changes or cancellations</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>📞 Contact: +91 8341674465 | 📧 vizagresortbooking@gmail.com</p>
                <p>Thank you for choosing our resort. We look forward to hosting you!</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: 'vizagresortbooking@gmail.com',
        to: booking.email,
        subject: `Booking Confirmation - ${booking.bookingReference} | ${resort.name}`,
        html: emailHtml
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('Booking confirmation email sent:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendBookingConfirmation };