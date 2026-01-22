const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());

const db = new sqlite3.Database('./resort_booking.db');

// Get all tables
app.get('/api/tables', (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// Get data from any table
app.get('/api/:table', (req, res) => {
    const table = req.params.table;
    db.all(`SELECT * FROM ${table}`, (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.listen(3004, () => {
    console.log('Database API running on port 3004');
});
