const PDFDocument = require('pdfkit');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

async function generateInvoicePDF(booking, resort) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(chunks);
                const fileName = `invoice-${booking.bookingReference}.pdf`;
                
                try {
                    // Upload to S3
                    const result = await s3.upload({
                        Bucket: process.env.S3_BUCKET || 'resort3413',
                        Key: `invoices/${fileName}`,
                        Body: pdfBuffer,
                        ContentType: 'application/pdf'
                    }).promise();
                    
                    resolve(result.Location);
                } catch (uploadError) {
                    reject(uploadError);
                }
            });
            
            // Header
            doc.fontSize(20).text('BOOKING INVOICE', 50, 50);
            doc.fontSize(12).text(`Invoice #: ${booking.bookingReference}`, 50, 80);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 100);
            
            // Line
            doc.moveTo(50, 130).lineTo(550, 130).stroke();
            
            // Guest Details
            doc.fontSize(14).text('Guest Information:', 50, 150);
            doc.fontSize(12)
               .text(`Name: ${booking.guestName}`, 50, 170)
               .text(`Email: ${booking.email}`, 50, 190)
               .text(`Phone: ${booking.phone}`, 50, 210);
            
            // Resort Details
            doc.fontSize(14).text('Resort Information:', 50, 240);
            doc.fontSize(12)
               .text(`Resort: ${resort.name}`, 50, 260)
               .text(`Location: ${resort.location}`, 50, 280)
               .text(`Check-in: ${new Date(booking.checkIn).toLocaleDateString()} at 11:00 AM`, 50, 300)
               .text(`Check-out: ${new Date(booking.checkOut).toLocaleDateString()} at 9:00 AM`, 50, 320)
               .text(`Guests: ${booking.guests}`, 50, 340);
            
            // Pricing
            doc.fontSize(14).text('Payment Details:', 50, 370);
            const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
            const baseAmount = resort.price * nights;
            const platformFee = Math.round(baseAmount * 0.015);
            
            doc.fontSize(12)
               .text(`Base Amount (${nights} nights): ₹${baseAmount.toLocaleString()}`, 50, 390)
               .text(`Platform Fee (1.5%): ₹${platformFee.toLocaleString()}`, 50, 410)
               .text(`Total Amount: ₹${(booking.total_price || booking.totalPrice || 0).toLocaleString()}`, 50, 430, { underline: true });
            
            // Footer
            doc.fontSize(10)
               .text('Thank you for choosing our resort!', 50, 500)
               .text('Contact: vizagresortbooking@gmail.com', 50, 520);
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateInvoicePDF };