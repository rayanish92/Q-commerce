const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ==========================
// 1. REGISTER A NEW USER
// ==========================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, shopName, location } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Encrypt the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the new user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer', // Default to customer if not provided
      shopName: role === 'retailer' ? shopName : undefined,
      location: location // [longitude, latitude]
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ==========================
// 2. LOGIN USER
// ==========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create the JWT Token
    const payload = {
      user: {
        id: user._id,
        role: user.role
      }
    };

    // Token expires in 7 days (7d)
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        // Send the token and user details (hiding the password) back to the frontend
        res.json({
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            shopName: user.shopName
          }
        });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
