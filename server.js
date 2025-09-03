const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// In-memory data store (replace with database in production)
let resorts = [
    {
        id: 1,
        name: "Paradise Beach Resort",
        location: "Goa",
        price: 5000,
        description: "Luxury beachfront resort with stunning ocean views",
        image: "/uploads/default-resort.jpg",
        amenities: ["Swimming Pool", "Spa", "Restaurant", "WiFi"],
        rating: 4.5
    },
    {
        id: 2,
        name: "Mountain View Resort",
        location: "Manali",
        price: 4000,
        description: "Peaceful mountain retreat with breathtaking views",
        image: "/uploads/default-resort.jpg",
        amenities: ["Gym", "Restaurant", "WiFi", "Parking"],
        rating: 4.2
    }
];

let bookings = [];
let nextId = 3;
let nextBookingId = 1;

// API Routes

// Get all resorts
app.get('/api/resorts', (req, res) => {
    res.json(resorts);
});

// Add new resort
app.post('/api/resorts', upload.single('image'), (req, res) => {
    const { name, location, price, description, amenities } = req.body;
    
    const newResort = {
        id: nextId++,
        name,
        location,
        price: parseInt(price),
        description,
        image: req.file ? `/uploads/${req.file.filename}` : '/uploads/default-resort.jpg',
        amenities: amenities ? amenities.split(',').map(a => a.trim()) : [],
        rating: 0
    };
    
    resorts.push(newResort);
    res.json(newResort);
});

// Update resort
app.put('/api/resorts/:id', upload.single('image'), (req, res) => {
    const id = parseInt(req.params.id);
    const resortIndex = resorts.findIndex(r => r.id === id);
    
    if (resortIndex === -1) {
        return res.status(404).json({ error: 'Resort not found' });
    }
    
    const { name, location, price, description, amenities } = req.body;
    
    resorts[resortIndex] = {
        ...resorts[resortIndex],
        name: name || resorts[resortIndex].name,
        location: location || resorts[resortIndex].location,
        price: price ? parseInt(price) : resorts[resortIndex].price,
        description: description || resorts[resortIndex].description,
        image: req.file ? `/uploads/${req.file.filename}` : resorts[resortIndex].image,
        amenities: amenities ? amenities.split(',').map(a => a.trim()) : resorts[resortIndex].amenities
    };
    
    res.json(resorts[resortIndex]);
});

// Delete resort
app.delete('/api/resorts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const resortIndex = resorts.findIndex(r => r.id === id);
    
    if (resortIndex === -1) {
        return res.status(404).json({ error: 'Resort not found' });
    }
    
    resorts.splice(resortIndex, 1);
    res.json({ message: 'Resort deleted successfully' });
});

// Book a resort
app.post('/api/bookings', (req, res) => {
    const { resortId, guestName, email, phone, checkIn, checkOut, guests } = req.body;
    
    const resort = resorts.find(r => r.id === parseInt(resortId));
    if (!resort) {
        return res.status(404).json({ error: 'Resort not found' });
    }
    
    const booking = {
        id: nextBookingId++,
        resortId: parseInt(resortId),
        resortName: resort.name,
        guestName,
        email,
        phone,
        checkIn,
        checkOut,
        guests: parseInt(guests),
        totalPrice: resort.price * parseInt(guests),
        status: 'confirmed',
        bookingDate: new Date().toISOString()
    };
    
    bookings.push(booking);
    res.json(booking);
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
    res.json(bookings);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});