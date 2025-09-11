const AWS = require('aws-sdk');
const fs = require('fs');
const cron = require('node-cron');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

// Daily backup at 2 AM
function startBackupSchedule() {
    cron.schedule('0 2 * * *', async () => {
        await backupDatabase();
    });
    
    console.log('📅 Database backup scheduled for 2 AM daily');
}

async function backupDatabase() {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const backupFile = `backup-${timestamp}.db`;
        
        // Copy database file
        fs.copyFileSync('./resort_booking.db', backupFile);
        
        // Upload to S3
        const fileContent = fs.readFileSync(backupFile);
        await s3.upload({
            Bucket: process.env.S3_BUCKET || 'resort3413',
            Key: `backups/${backupFile}`,
            Body: fileContent
        }).promise();
        
        // Clean up local copy
        fs.unlinkSync(backupFile);
        console.log(`✅ Database backed up: ${backupFile}`);
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
    }
}

// Manual backup function
async function manualBackup() {
    await backupDatabase();
}

module.exports = { startBackupSchedule, manualBackup };