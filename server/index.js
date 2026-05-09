const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((err) => console.log("MongoDB Connection Error: ", err));

// ==========================
// ROUTES
// ==========================
app.use('/api/auth', require('./routes/authRoutes'));

// Test Route
app.get('/', (req, res) => {
  res.json({ 
    status: "Success",
    message: "Quick Commerce API & Database are live!" 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
