const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { verifyAdmin, verifyToken, verifyRetailerOrAdmin } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => jwt.sign(
  { user: { id: user._id, role: user.role, name: user.name, shopName: user.shopName } }, 
  process.env.JWT_SECRET, { expiresIn: '7d' }
);

// --- Auth Routes ---
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'User exists' });
    const user = new User({ name, email, password: await bcrypt.hash(password, 10), role: 'customer' });
    await user.save();
    res.status(201).json({ message: 'Registration successful!' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: 'Invalid credentials' });
    res.json({ token: generateToken(user), user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/admin-create-staff', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, role, shopName, retailerCategory, lat, lng, contactNumber } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email in use' });
    const user = new User({ 
      name, email, password: await bcrypt.hash(password, 10), role, contactNumber,
      shopName: role === 'retailer' ? shopName : undefined,
      retailerCategory: role === 'retailer' ? retailerCategory : undefined,
      location: (lat && lng) ? { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } : undefined
    });
    await user.save();
    res.status(201).json({ message: `${role} created!` });
  } catch (err) { res.status(500).json({ message: 'Error creating staff' }); }
});

router.post('/register-admin', async (req, res) => {
  try {
    if (req.body.adminSecret !== process.env.ADMIN_SECRET) return res.status(403).json({ message: 'Denied' });
    const user = new User({ ...req.body, password: await bcrypt.hash(req.body.password, 10), role: 'admin' });
    await user.save();
    res.status(201).json({ message: 'Admin created!' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// --- User Profile Routes (Addresses & Bank) ---
router.get('/me', verifyToken, async (req, res) => {
  try { res.json(await User.findById(req.user.id).select('-password')); } 
  catch (err) { res.status(500).json({ message: 'Error fetching user' }); }
});

router.post('/address', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses.push(req.body);
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ message: 'Error saving address' }); }
});

router.delete('/address/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.id);
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ message: 'Error deleting address' }); }
});

router.put('/bank', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { bankDetails: req.body }, { new: true });
    res.json(user.bankDetails);
  } catch (err) { res.status(500).json({ message: 'Error saving bank details' }); }
});

module.exports = router;
