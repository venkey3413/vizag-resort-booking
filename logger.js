const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Mask sensitive data
function maskSensitiveData(data) {
    if (!data) return data;
    
    const masked = { ...data };
    const sensitiveFields = [
        'password', 'token', 'secret', 'apiKey', 'api_key',
        'paymentId', 'payment_id', 'transactionId', 'transaction_id',
        'orderId', 'order_id', 'razorpay_payment_id', 'razorpay_order_id',
        'signature', 'razorpay_signature', 'utr', 'utr_number'
    ];
    
    sensitiveFields.forEach(field => {
        if (masked[field]) {
            const value = String(masked[field]);
            if (value.length > 8) {
                masked[field] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
            } else {
                masked[field] = '****';
            }
        }
    });
    
    return masked;
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: process.env.SERVICE_NAME || 'vizag-resort' },
    transports: []
});

// Production: Log to files with rotation
if (process.env.NODE_ENV === 'production') {
    logger.add(new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
    }));
    
    logger.add(new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
    }));
} else {
    // Development: Log to console with colors
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Wrapper functions with automatic masking
const log = {
    info: (message, data) => {
        logger.info(message, maskSensitiveData(data));
    },
    
    error: (message, error, data) => {
        logger.error(message, {
            error: error?.message || error,
            stack: error?.stack,
            ...maskSensitiveData(data)
        });
    },
    
    warn: (message, data) => {
        logger.warn(message, maskSensitiveData(data));
    },
    
    debug: (message, data) => {
        logger.debug(message, maskSensitiveData(data));
    },
    
    // Special method for payment logs
    payment: (message, data) => {
        const maskedData = {
            ...maskSensitiveData(data),
            amount: data?.amount,
            status: data?.status,
            method: data?.method,
            timestamp: new Date().toISOString()
        };
        logger.info(`[PAYMENT] ${message}`, maskedData);
    }
};

module.exports = log;
