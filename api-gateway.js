const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 4000;

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
app.use(express.json());

// Service endpoints
const SERVICES = {
    main: 'http://localhost:3000',
    admin: 'http://localhost:3001', 
    booking: 'http://localhost:3002'
};

// Gateway routes - broadcast to all services
app.post('/api/gateway/booking', async (req, res) => {
    try {
        // Create booking in main service
        const bookingResponse = await axios.post(`${SERVICES.main}/api/bookings`, req.body);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.admin}/api/sync/booking-created`, bookingResponse.data).catch(e => console.log('Admin sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/booking-created`, bookingResponse.data).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(bookingResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/gateway/resort', async (req, res) => {
    try {
        // Create/update resort in admin service
        const resortResponse = await axios.post(`${SERVICES.admin}/api/resorts`, req.body);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.main}/api/sync/resort-updated`, req.body).catch(e => console.log('Main sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/resort-updated`, req.body).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(resortResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/gateway/resort/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Update resort in admin service
        const resortResponse = await axios.put(`${SERVICES.admin}/api/resorts/${id}`, req.body);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.main}/api/sync/resort-updated`, { id, ...req.body }).catch(e => console.log('Main sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/resort-updated`, { id, ...req.body }).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(resortResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gateway/resort/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Delete resort in admin service
        const resortResponse = await axios.delete(`${SERVICES.admin}/api/resorts/${id}`);
        
        // Notify other services
        await Promise.all([
            axios.post(`${SERVICES.main}/api/sync/resort-deleted`, { id }).catch(e => console.log('Main sync failed:', e.message)),
            axios.post(`${SERVICES.booking}/api/sync/resort-deleted`, { id }).catch(e => console.log('Booking sync failed:', e.message))
        ]);
        
        res.json(resortResponse.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Resort Booking API Gateway',
        version: '1.0.0',
        services: SERVICES,
        endpoints: {
            'POST /api/gateway/booking': 'Create booking',
            'POST /api/gateway/resort': 'Add resort',
            'PUT /api/gateway/resort/:id': 'Update resort',
            'DELETE /api/gateway/resort/:id': 'Delete resort',
            'GET /health': 'Health check'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway running', services: SERVICES });
});

app.listen(PORT, () => {
    console.log(`🌐 API Gateway running on http://localhost:${PORT}`);
    console.log(`📡 Routing to services:`, SERVICES);
});