const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// In-memory storage for resorts (use database in production)
let resorts = [
  {
    id: 1,
    name: "Ocean View Resort",
    price: 299,
    description: "Luxury beachfront resort with stunning ocean views",
    image: null
  }
];

// Routes
app.get('/api/resorts', (req, res) => {
  res.json(resorts);
});

app.post('/api/resorts', upload.single('image'), (req, res) => {
  const { name, price, description } = req.body;
  const newResort = {
    id: resorts.length + 1,
    name,
    price: parseFloat(price),
    description,
    image: req.file ? req.file.filename : null
  };
  resorts.push(newResort);
  res.json(newResort);
});

app.put('/api/resorts/:id', upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price, description } = req.body;
  const resort = resorts.find(r => r.id === id);
  
  if (!resort) {
    return res.status(404).json({ error: 'Resort not found' });
  }
  
  resort.name = name || resort.name;
  resort.price = price ? parseFloat(price) : resort.price;
  resort.description = description || resort.description;
  if (req.file) {
    resort.image = req.file.filename;
  }
  
  res.json(resort);
});

app.delete('/api/resorts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  resorts = resorts.filter(r => r.id !== id);
  res.json({ message: 'Resort deleted' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});