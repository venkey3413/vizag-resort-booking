const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const eventBridgeListener = require('./eventbridge-listener');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('admin-public'));

// Real-time EventBridge listener endpoint
app.get('/api/events', (req, res) => {
    const clientId = `admin-${Date.now()}-${Math.random()}`;
    eventBridgeListener.subscribe(clientId, res, 'admin');
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`👨‍💼 Admin Panel running on http://0.0.0.0:${PORT}`);
});