// AWS Cognito Configuration
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const cognito = new AWS.CognitoIdentityServiceProvider();

// Cognito User Pool Configuration
const COGNITO_CONFIG = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    ClientId: process.env.COGNITO_CLIENT_ID,
    Region: process.env.AWS_REGION || 'us-east-1'
};

// Admin authentication
async function authenticateAdmin(username, password) {
    try {
        const params = {
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            ClientId: COGNITO_CONFIG.ClientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        };

        const result = await cognito.adminInitiateAuth(params).promise();
        return {
            success: true,
            accessToken: result.AuthenticationResult.AccessToken,
            idToken: result.AuthenticationResult.IdToken,
            refreshToken: result.AuthenticationResult.RefreshToken
        };
    } catch (error) {
        console.error('Cognito auth error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Verify JWT token
async function verifyToken(token) {
    try {
        const params = {
            AccessToken: token
        };

        const result = await cognito.getUser(params).promise();
        return {
            valid: true,
            user: result
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

// Create admin user (run once)
async function createAdminUser(username, password, email) {
    try {
        const params = {
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            Username: username,
            TemporaryPassword: password,
            MessageAction: 'SUPPRESS',
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email
                },
                {
                    Name: 'email_verified',
                    Value: 'true'
                }
            ]
        };

        await cognito.adminCreateUser(params).promise();
        
        // Set permanent password
        const setPasswordParams = {
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            Username: username,
            Password: password,
            Permanent: true
        };

        await cognito.adminSetUserPassword(setPasswordParams).promise();
        
        return { success: true };
    } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    authenticateAdmin,
    verifyToken,
    createAdminUser,
    COGNITO_CONFIG
};