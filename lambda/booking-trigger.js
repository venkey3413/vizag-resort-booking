const AWS = require('aws-sdk');
const https = require('https');

exports.handler = async (event) => {
    console.log('Booking trigger event:', JSON.stringify(event, null, 2));
    
    try {
        const { action, data } = JSON.parse(event.body || event);
        
        // Service endpoints
        const services = [
            'http://localhost:3001', // Admin Panel
            'http://localhost:3002'  // Booking History
        ];
        
        // Trigger updates to all services
        const promises = services.map(service => {
            return makeHttpRequest(service, action, data);
        });
        
        await Promise.all(promises);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                message: 'Services updated successfully',
                action,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function makeHttpRequest(serviceUrl, action, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ action, data });
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(`${serviceUrl}/api/lambda-update`, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}