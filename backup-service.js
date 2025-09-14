const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const DB_PATH = path.join(__dirname, 'data', 'resort_booking.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `resort_booking_${timestamp}.db`);
        
        if (fs.existsSync(DB_PATH)) {
            fs.copyFileSync(DB_PATH, backupPath);
            console.log(`✅ Database backup created: ${backupPath}`);
            
            // Keep only last 7 backups
            cleanOldBackups();
        }
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
    }
}

function cleanOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('resort_booking_') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
            }))
            .sort((a, b) => b.time - a.time);
        
        // Keep only 7 most recent backups
        files.slice(7).forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`🗑️ Deleted old backup: ${file.name}`);
        });
    } catch (error) {
        console.error('Error cleaning backups:', error.message);
    }
}

function startBackupSchedule() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', () => {
        console.log('🔄 Starting scheduled backup...');
        createBackup();
    });
    
    // Weekly backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', () => {
        console.log('🔄 Starting weekly backup...');
        createBackup();
    });
    
    console.log('📅 Backup schedule started - Daily at 2 AM, Weekly on Sunday at 3 AM');
}

module.exports = { createBackup, startBackupSchedule };