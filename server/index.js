const express = require('express');
const cors = require('cors');
// We will uncomment mongoose once you have your database URL
// const mongoose = require('mongoose'); 

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// A simple test route so Render can show us it works
app.get('/', (req, res) => {
  res.json({ 
    status: "Success",
    message: "Quick Commerce API is live and running!" 
  });
});

// Use Render's port, or default to 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
