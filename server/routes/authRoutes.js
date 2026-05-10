const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ==========================
// 1. STANDARD PUBLIC REGISTRATION (No Admins Allowed!)
// ==========================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, shopName, location } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // SECURITY CHECK: Strictly forbid 'admin' role from this route
    const allowedRoles = ['customer', 'retailer', 'delivery_agent'];
    const assignedRole = allowedRoles.includes(role) ? role : 'customer';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      shopName: assignedRole === 'retailer' ? shopName : undefined,
      location
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (err) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ==========================
// 2. SECRET ADMIN REGISTRATION
// ==========================
router.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    // SECURITY CHECK: Must provide the exact secret passcode
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: 'Access Denied: Invalid Admin Secret' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Force role to admin
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await user.save();
    res.status(201).json({ message: 'Admin account created securely!' });

  } catch (err) {
    res.status(500).json({ message: 'Server error during admin registration' });
  }
});

// ==========================
// 3. UNIVERSAL LOGIN
// ==========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: user._id, role: user.role } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
