const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate the fixed JWT
const generateToken = (user) => {
  return jwt.sign(
    { user: { id: user._id, role: user.role, name: user.name, shopName: user.shopName } },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user = new User({ name, email, password: hashedPassword, role: 'customer' });
    await user.save();
    res.status(201).json({ message: 'Registration successful!' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);
      user = new User({ name: payload.name, email: payload.email, password: randomPassword, role: 'customer' });
      await user.save();
    }
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ message: 'Google Auth Failed' }); }
});

router.post('/admin-create-staff', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, role, shopName, retailerCategory, lat, lng, contactNumber } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'Email already in use' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUserObj = { 
      name, email, password: hashedPassword, role, contactNumber,
      shopName: role === 'retailer' ? shopName : undefined,
      retailerCategory: role === 'retailer' ? retailerCategory : undefined
    };

    if (lat && lng) newUserObj.location = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };

    user = new User(newUserObj);
    await user.save();
    res.status(201).json({ message: `${role} created successfully!` });
  } catch (err) { res.status(500).json({ message: 'Server error creating staff' }); }
});

router.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;
    if (adminSecret !== process.env.ADMIN_SECRET) return res.status(403).json({ message: 'Access Denied' });
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User exists' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user = new User({ name, email, password: hashedPassword, role: 'admin' });
    await user.save();
    res.status(201).json({ message: 'Admin created!' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, shopName: user.shopName } });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
