const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database securely using Render's Environment Variable
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((err) => console.log("MongoDB Connection Error: ", err));

// ==========================
// ROUTES
// ==========================
// 1. Authentication Routes (Register, Login)
app.use('/api/auth', require('./routes/authRoutes'));

// 2. Product & Inventory Routes (Add, Delete, Nearby 10km Search)
app.use('/api/products', require('./routes/productRoutes'));

// ==========================
// TEST ROUTE
// ==========================
app.get('/', (req, res) => {
  res.json({ 
    status: "Success",
    message: "Quick Commerce API & Database are live!" 
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
