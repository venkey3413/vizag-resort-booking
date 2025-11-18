// Add this to your existing server.js

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, session_id } = req.body;
        
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, session_id })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ 
            answer: 'Chat service unavailable. Contact support.',
            handover: true 
        });
    }
});

// Chat widget route
app.use('/chat', express.static('chat-public'));