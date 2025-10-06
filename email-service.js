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

async function sendInvoiceEmail(booking, type = 'resort') {
    console.log('📧 Attempting to send email to:', booking.email);
    try {
        let invoiceHTML;
        
        if (type === 'food') {
            // Food order invoice
            const itemsList = booking.items.map(item => 
                `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${item.price * item.quantity}</td></tr>`
            ).join('');
            
            invoiceHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="My Food - Vizag Resort Booking" style="max-width: 150px; height: auto;">
                    </div>
                    <h2 style="color: #333; text-align: center;">Food Order Confirmation</h2>
                    
                    <p>Dear Customer,</p>
                    
                    <p>Thank you for your food order! Your order has been confirmed and will be delivered within Your Delivery slot time.</p>
                    
                    <p><strong>Order Details:</strong></p>
                    
                    <p><strong>Order ID:</strong> ${booking.orderId}</p>
                    <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                    <p><strong>Resort:</strong> ${booking.resortName}</p>
                    <p><strong>Guest Name:</strong> ${booking.customerName}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Order Date:</strong> ${new Date(booking.orderDate).toLocaleDateString()}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList}
                        </tbody>
                    </table>
                    
                    <p><strong>Subtotal:</strong> ₹${booking.subtotal}</p>
                    <p><strong>Delivery Fee:</strong> ₹${booking.deliveryFee}</p>
                    <p><strong>Total Amount:</strong> ₹${booking.total}</p>
                    <p><strong>Payment Method:</strong> ${booking.paymentMethod?.toUpperCase()}</p>
                    ${booking.transactionId ? `<p><strong>Transaction ID:</strong> ${booking.transactionId}</p>` : ''}
                    
                    <p>Your food will be delivered to your resort location within Your Delivery slot time.</p>
                    
                    <p>For any queries, please contact us at vizagresortbooking@gmail.com</p>
                    
                    <p>Thank you for choosing My Food!</p>
                    
                    <p>Best regards,<br>
                    My Food Team<br>
                    🌐 <a href="https://vizagresortbooking.in/food" style="color: #667eea;">https://vizagresortbooking.in/food</a></p>
                </div>
            `;
        } else if (type === 'food_cancelled') {
            // Food order cancellation email
            const itemsList = booking.items.map(item => 
                `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${item.price * item.quantity}</td></tr>`
            ).join('');
            
            invoiceHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="My Food - Vizag Resort Booking" style="max-width: 150px; height: auto;">
                    </div>
                    <h2 style="color: #dc3545; text-align: center;">Food Order Cancelled</h2>
                    
                    <p>Dear ${booking.customerName},</p>
                    
                    <p>We regret to inform you that your food order has been cancelled.</p>
                    
                    <p><strong>Cancelled Order Details:</strong></p>
                    
                    <p><strong>Order ID:</strong> ${booking.orderId}</p>
                    <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                    <p><strong>Resort:</strong> ${booking.resortName}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Order Date:</strong> ${new Date(booking.orderDate).toLocaleDateString()}</p>
                    <p><strong>Cancelled Date:</strong> ${new Date(booking.cancelledAt).toLocaleDateString()}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList}
                        </tbody>
                    </table>
                    
                    <p><strong>Subtotal:</strong> ₹${booking.subtotal}</p>
                    <p><strong>Delivery Fee:</strong> ₹${booking.deliveryFee}</p>
                    <p><strong>Total Amount:</strong> ₹${booking.total}</p>
                    
                    <p style="color: #dc3545; font-weight: bold;">If you made any payment, it will be refunded within 3-5 business days.</p>
                    
                    <p>For any queries, please contact us at vizagresortbooking@gmail.com</p>
                    
                    <p>We apologize for any inconvenience caused.</p>
                    
                    <p>Best regards,<br>
                    My Food Team<br>
                    🌐 <a href="https://vizagresortbooking.in/food" style="color: #667eea;">https://vizagresortbooking.in/food</a></p>
                </div>
            `;
        } else {
            // Resort booking invoice
            invoiceHTML = `
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
                    
                    <p><strong>You can order food using this link:</strong> <a href="https://vizagresortbooking.in/food/" style="color: #667eea;">https://vizagresortbooking.in/food/</a></p>
                    
                    <p>Thank you for choosing vizagresortbooking.in.</p>
                    
                    <p>Warm regards,<br>
                    vizagresortbooking.in Team<br>
                    🌐 <a href="https://vizagresortbooking.in/" style="color: #667eea;">https://vizagresortbooking.in/</a></p>
                </div>
            `;
        }

        const path = require('path');
        const fs = require('fs');
        
        // Try to attach PDF, but don't fail if missing
        const pdfPath = path.join(__dirname, 'bookings-public', 'Cancellation & terms and conditions.pdf');
        const attachments = [];
        
        if (fs.existsSync(pdfPath)) {
            attachments.push({
                filename: 'Terms and Conditions.pdf',
                path: pdfPath
            });
            console.log('📎 PDF attachment added');
        } else {
            console.log('⚠️ PDF not found, sending email without attachment');
        }
        
        const subject = type === 'food' ? 'Food Order Confirmation – My Food' : 
                        type === 'food_cancelled' ? 'Food Order Cancelled – My Food' : 
                        'Booking Confirmation – vizagresortbooking.in';
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.email,
            subject: subject,
            html: invoiceHTML,
            attachments: type === 'resort' ? attachments : [] // Only attach PDF for resort bookings
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