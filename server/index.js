const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs'); // REQUIRED for reading and modifying HTML
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

// API Health Check
app.get('/api/status', (req, res) => res.json({ status: "Success", message: "Quick Commerce API & Database are live!" }));

// --- FRONTEND MULTI-PWA ROUTING LOGIC ---

// 1. Serve static assets (JS, CSS, images) normally
// IMPORTANT: { index: false } prevents Express from automatically sending the raw index.html for the home page
app.use(express.static(path.join(__dirname, '../client/dist'), { index: false }));

// 2. The Smart Manifest Injector (Catches ALL frontend routes)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  
  fs.readFile(indexPath, 'utf8', (err, htmlData) => {
    if (err) {
      console.error('Error reading index.html', err);
      return res.status(500).send('Server Error: Cannot find frontend build.');
    }

    // A. Figure out which portal the user is asking for based on the URL
    let manifestToUse = '/manifest-customer.json'; 
    if (req.path.startsWith('/admin')) {
      manifestToUse = '/manifest-admin.json';
    } else if (req.path.startsWith('/retailer')) {
      manifestToUse = '/manifest-retailer.json';
    } else if (req.path.startsWith('/agent')) {
      manifestToUse = '/manifest-agent.json';
    }

    // B. Strip out whatever default manifest Vite injected during the build
    let cleanHtml = htmlData.replace(/<link rel="manifest"[^>]*>/g, '');

    // C. Inject the correct manifest for this specific portal right before </head>
    const finalHtml = cleanHtml.replace(
      '</head>',
      `  <link rel="manifest" href="${manifestToUse}">\n</head>`
    );

    // D. Send the perfectly formatted HTML to Chrome
    res.send(finalHtml);
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
