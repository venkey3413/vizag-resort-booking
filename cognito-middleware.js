// Cognito Authentication Middleware
const { verifyToken } = require('./cognito-config');

// Middleware to verify Cognito JWT tokens
async function cognitoAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        const verification = await verifyToken(token);
        
        if (!verification.valid) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Add user info to request
        req.user = verification.user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// Optional auth - doesn't block if no token
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const verification = await verifyToken(token);
            
            if (verification.valid) {
                req.user = verification.user;
            }
        }
        
        next();
    } catch (error) {
        // Continue without auth if token verification fails
        next();
    }
}

module.exports = {
    cognitoAuth,
    optionalAuth
};