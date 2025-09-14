const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'resort-booking-secret-key';
const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false
});

const bookingLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many booking attempts');
const generalLimiter = createRateLimit(15 * 60 * 1000, 100, 'Too many requests');

// Origin validation
function validateOrigin(req, res, next) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin && !ALLOWED_ORIGINS.some(allowed => origin.includes(allowed))) {
        return res.status(403).json({ error: 'Forbidden origin' });
    }
    next();
}

// JWT validation
function validateJWT(req, res, next) {
    // Skip for internal service calls
    if (req.headers['x-internal-service']) {
        return next();
    }
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid access token' });
    }
}

// Generate JWT token
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Input validation rules
const bookingValidation = [
    body('guestName').trim().isLength({ min: 2, max: 50 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').isMobilePhone(),
    body('checkIn').isISO8601(),
    body('checkOut').isISO8601(),
    body('guests').isInt({ min: 1, max: 20 })
];

const resortValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('location').trim().isLength({ min: 2, max: 100 }).escape(),
    body('price').isInt({ min: 100 }),
    body('description').trim().isLength({ max: 1000 }).escape()
];

// Validation error handler
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors.array() 
        });
    }
    next();
}

module.exports = {
    bookingLimiter,
    generalLimiter,
    validateOrigin,
    validateJWT,
    generateToken,
    bookingValidation,
    resortValidation,
    handleValidationErrors
};