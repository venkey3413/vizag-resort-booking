const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS (use IAM role or environment variables)
const s3 = new AWS.S3({
    region: 'ap-south-1' // Change to your region
});

const BUCKET_NAME = 'vizag-resort-backups'; // Change to your bucket name

// Backup database to S3
async function backupDatabase() {
    try {
        const dbPath = './resort_booking.db';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `database-backups/resort_booking_${timestamp}.db`;
        
        const fileStream = fs.createReadStream(dbPath);
        
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: backupKey,
            Body: fileStream,
            ContentType: 'application/x-sqlite3'
        };
        
        const result = await s3.upload(uploadParams).promise();
        console.log(`✅ Database backed up to S3: ${result.Location}`);
        return result.Location;
    } catch (error) {
        console.error('❌ Database backup failed:', error);
        throw error;
    }
}

// Generate and upload invoice
async function generateInvoice(bookingData) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const invoiceData = {
            invoiceId: `INV-${bookingData.id}-${Date.now()}`,
            bookingId: bookingData.id,
            guestName: bookingData.guest_name,
            email: bookingData.email,
            phone: bookingData.phone,
            resortName: bookingData.resort_name,
            checkIn: bookingData.check_in,
            checkOut: bookingData.check_out,
            guests: bookingData.guests,
            totalAmount: bookingData.total_price,
            paymentStatus: 'PAID',
            paymentDate: new Date().toISOString(),
            generatedAt: new Date().toISOString()
        };
        
        const invoiceKey = `invoices/invoice_${bookingData.id}_${timestamp}.json`;
        
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: invoiceKey,
            Body: JSON.stringify(invoiceData, null, 2),
            ContentType: 'application/json'
        };
        
        const result = await s3.upload(uploadParams).promise();
        console.log(`📄 Invoice generated: ${result.Location}`);
        return { invoiceData, s3Location: result.Location };
    } catch (error) {
        console.error('❌ Invoice generation failed:', error);
        throw error;
    }
}

// Schedule automatic backups
function scheduleBackups() {
    // Backup every 6 hours
    setInterval(backupDatabase, 6 * 60 * 60 * 1000);
    console.log('🔄 Automatic backups scheduled every 6 hours');
}

module.exports = {
    backupDatabase,
    generateInvoice,
    scheduleBackups
};