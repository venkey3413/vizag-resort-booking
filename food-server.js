const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());
app.use(express.static('food-public'));

// Serve food service
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/food-public/index.html');
});

// Food orders endpoint (for future expansion)
app.post('/api/food-orders', (req, res) => {
    try {
        const { bookingId, phoneNumber, items, subtotal, deliveryFee, total } = req.body;
        
        // Here you would typically save to database
        console.log('Food order received:', {
            bookingId,
            phoneNumber,
            items,
            subtotal,
            deliveryFee,
            total,
            orderTime: new Date()
        });
        
        res.json({ 
            success: true, 
            message: 'Order received successfully',
            orderId: `FO${Date.now()}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process order' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍽️ My Food Service running on http://0.0.0.0:${PORT}`);
});