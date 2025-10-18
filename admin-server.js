const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const eventBridgeListener = require('./eventbridge-listener');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Cache-busting headers
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static('admin-public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Real-time EventBridge listener endpoint
app.get('/api/events', (req, res) => {
    const clientId = `admin-${Date.now()}-${Math.random()}`;
    eventBridgeListener.subscribe(clientId, res, 'admin');
    console.log('📡 Admin panel connected to EventBridge');
});

// EventBridge notification endpoint
app.post('/api/eventbridge-notify', (req, res) => {
    const { type, source, data } = req.body;
    console.log(`📡 Admin server received EventBridge notification: ${type}`);
    eventBridgeListener.handleEvent(type, source, data);
    res.json({ success: true });
});

// Serve admin panel
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/admin-public/index.html');
});

// Forward resort requests to booking-server
app.get('/api/resorts', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3002/api/resorts');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resorts' });
    }
});

app.post('/api/resorts', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3002/api/resorts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add resort' });
    }
});

app.put('/api/resorts/:id', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/resorts/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resort' });
    }
});

app.get('/api/dynamic-pricing/:resortId', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/dynamic-pricing/${req.params.resortId}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dynamic pricing' });
    }
});

app.post('/api/dynamic-pricing', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3002/api/dynamic-pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update dynamic pricing' });
    }
});

app.delete('/api/resorts/:id', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/resorts/${req.params.id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete resort' });
    }
});

// Food item management endpoints
app.get('/api/food-items', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3000/api/food-items');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch food items' });
    }
});

app.post('/api/food-items', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3000/api/food-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add food item' });
    }
});

app.put('/api/food-items/:id', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/food-items/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update food item' });
    }
});

app.delete('/api/food-items/:id', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/food-items/${req.params.id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete food item' });
    }
});

// Travel packages management endpoints
app.get('/api/travel-packages', async (req, res) => {
    try {
        console.log('🔄 Admin server forwarding GET request to main server for travel packages');
        const response = await fetch('http://localhost:3000/api/travel-packages');
        const data = await response.json();
        console.log(`📥 Retrieved ${data.length} travel packages from main server`);
        res.json(data);
    } catch (error) {
        console.error('❌ Admin server error fetching travel packages:', error);
        res.status(500).json({ error: `Failed to fetch travel packages: ${error.message}` });
    }
});

app.post('/api/travel-packages', async (req, res) => {
    try {
        console.log('🔄 Admin server forwarding POST request to main server for new travel package');
        console.log('📤 Request body:', req.body);
        
        const response = await fetch('http://localhost:3000/api/travel-packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        console.log(`📥 Main server response status: ${response.status}`);
        const data = await response.json();
        console.log('📥 Main server response data:', data);
        
        res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ Admin server error forwarding travel package creation:', error);
        res.status(500).json({ error: `Failed to add travel package: ${error.message}` });
    }
});

app.put('/api/travel-packages/:id', async (req, res) => {
    try {
        console.log(`🔄 Admin server forwarding PUT request to main server for travel package ${req.params.id}`);
        console.log('📤 Request body:', req.body);
        
        const response = await fetch(`http://localhost:3000/api/travel-packages/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        console.log(`📥 Main server response status: ${response.status}`);
        const data = await response.json();
        console.log('📥 Main server response data:', data);
        
        res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ Admin server error forwarding travel package update:', error);
        res.status(500).json({ error: `Failed to update travel package: ${error.message}` });
    }
});

app.delete('/api/travel-packages/:id', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3000/api/travel-packages/${req.params.id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete travel package' });
    }
});

// Forward booking requests to booking-server
app.get('/api/bookings', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3002/api/bookings');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/bookings/${req.params.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

app.put('/api/bookings/:id/payment', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/bookings/${req.params.id}/payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.post('/api/bookings/:id/send-email', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/bookings/${req.params.id}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Coupon management endpoints
app.get('/api/coupons', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3002/api/coupons');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

app.post('/api/coupons', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3002/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

app.delete('/api/coupons/:code', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:3002/api/coupons/${req.params.code}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`👨‍💼 Admin Panel running on http://0.0.0.0:${PORT}`);
});