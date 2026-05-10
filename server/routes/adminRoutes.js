const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const MasterProduct = require('../models/MasterProduct');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) { res.status(500).json({ message: 'Error fetching users' }); }
});

router.post('/master-products', verifyAdmin, async (req, res) => {
  try {
    const newMaster = new MasterProduct(req.body);
    const savedMaster = await newMaster.save();
    res.status(201).json(savedMaster);
  } catch (err) { res.status(500).json({ message: 'Error creating master product' }); }
});

router.get('/master-products', verifyToken, async (req, res) => {
  try {
    const masterProducts = await MasterProduct.find().sort({ name: 1 });
    res.status(200).json(masterProducts);
  } catch (err) { res.status(500).json({ message: 'Error fetching master catalog' }); }
});

// Fetch all pending actions (New Products, Deletions, Price Updates)
router.get('/pending-approvals', verifyAdmin, async (req, res) => {
  try {
    const pendingProducts = await Product.find({ 
      status: { $in: ['Pending', 'Pending Deletion', 'Price Update Pending'] } 
    }).populate('retailerId', 'shopName name');
    res.status(200).json(pendingProducts);
  } catch (err) { res.status(500).json({ message: 'Error fetching approvals' }); }
});

// ADMIN APPROVES PRODUCT & SETS THE SELLING PRICE
router.put('/approve-product/:id', verifyAdmin, async (req, res) => {
  try {
    const { action, sellingPrice } = req.body; 
    if (action === 'approve') {
      const updated = await Product.findByIdAndUpdate(req.params.id, { 
        status: 'Approved',
        sellingPrice: sellingPrice // Admin dictates the final price
      }, { new: true });
      res.status(200).json(updated);
    } else {
      await Product.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: 'Product rejected and removed' });
    }
  } catch (err) { res.status(500).json({ message: 'Error processing approval' }); }
});

router.delete('/approve-deletion/:id', verifyAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Deletion approved' });
  } catch (err) { res.status(500).json({ message: 'Error processing deletion' }); }
});

module.exports = router;
