// Add to your server.js or app.js
const path = require('path');

// Serve PoolPay static files
app.use('/poolpay', express.static(path.join(__dirname, 'public/poolpay')));

// Handle PoolPay SPA routing
app.get('/poolpay/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/poolpay/index.html'));
});