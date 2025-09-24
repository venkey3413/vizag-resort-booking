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
    console.log('📧 Attempting to send email to:', booking.email);
    try {
        const invoiceHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="Vizag Resort Booking" style="max-width: 150px; height: auto;">
                </div>
                <h2 style="color: #333; text-align: center;">Booking Confirmation</h2>
                
                <p>Dear ${booking.guest_name},</p>
                
                <p>We are delighted to confirm your booking with ${booking.resort_name}.</p>
                
                <p><strong>Here are the details of your confirmed booking:</strong></p>
                
                <p><strong>Booking ID:</strong> ${booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`}</p>
                <p><strong>Guest Name:</strong> ${booking.guest_name}</p>
                <p><strong>Check-in Date:</strong> ${new Date(booking.check_in).toLocaleDateString()}</p>
                <p><strong>Check-out Date:</strong> ${new Date(booking.check_out).toLocaleDateString()}</p>
                <p><strong>Resort Name:</strong> ${booking.resort_name}</p>
                
                <p><strong>As per our booking policy:</strong></p>
                <p><strong>Check-in time:</strong> 11:00 AM</p>
                <p><strong>Check-out time:</strong> 9:00 AM</p>
                <p>Please carry a valid ID proof during check-in.</p>
                
                <p>Your payment has been successfully received, and your reservation is secured.</p>
                
                <p>If you wish to make any changes or need assistance, please contact us at vizagresortbooking@gmail.com</p>
                
                <p>We look forward to welcoming you for a memorable stay.</p>
                
                <p>Thank you for choosing vizagresortbooking.in.</p>
                
                <p>Warm regards,<br>
                vizagresortbooking.in Team<br>
                🌐 <a href="https://vizagresortbooking.in/" style="color: #667eea;">https://vizagresortbooking.in/</a></p>
            </div>
        `;

        const path = require('path');
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.email,
            subject: 'Booking Confirmation – vizagresortbooking.in',
            html: invoiceHTML,
            attachments: [
                {
                    filename: 'Cancellation & terms and conditions.pdf',
                    path: path.join(__dirname, 'public', 'Cancellation & terms and conditions.pdf')
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Invoice email sent successfully to ${booking.email}`);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        console.error('Full error:', error);
        return false;
    }
}

module.exports = { sendInvoiceEmail };