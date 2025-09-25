const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('admin-public'));

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`👨‍💼 Admin Panel running on http://0.0.0.0:${PORT}`);
});