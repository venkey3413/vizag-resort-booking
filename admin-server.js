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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`👨‍💼 Admin Panel running on http://0.0.0.0:${PORT}`);
});