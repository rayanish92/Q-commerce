const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // REQUIRED for serving the frontend files
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((err) => console.log("MongoDB Connection Error: ", err));

// --- API ROUTES ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// API Health Check (Moved to /api/status so it doesn't break the frontend)
app.get('/api/status', (req, res) => res.json({ status: "Success", message: "Quick Commerce API & Database are live!" }));

// --- FRONTEND MULTI-PWA ROUTING LOGIC ---

// 1. Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, '../client/dist')));

// 2. Serve specific HTML files so Chrome reads the right Manifest for each portal
app.get('/retailer*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/retailer.html'));
});

app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/admin.html'));
});

app.get('/agent*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/agent.html'));
});

// 3. Fallback to Customer App for the main URL (Must be the very last route!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
