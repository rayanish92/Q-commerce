const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const MasterProduct = require('../models/MasterProduct');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// 1. GET ALL USERS (Filtered by role)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    // Exclude passwords from the result
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// 2. CREATE MASTER PRODUCT
router.post('/master-products', verifyAdmin, async (req, res) => {
  try {
    const newMaster = new MasterProduct(req.body);
    const savedMaster = await newMaster.save();
    res.status(201).json(savedMaster);
  } catch (err) {
    res.status(500).json({ message: 'Error creating master product' });
  }
});

// 3. GET MASTER PRODUCTS (Retailers need this too, so just verifyToken)
router.get('/master-products', verifyToken, async (req, res) => {
  try {
    const masterProducts = await MasterProduct.find().sort({ name: 1 });
    res.status(200).json(masterProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching master catalog' });
  }
});

// 4. GET ALL PENDING APPROVALS (Additions & Deletions)
router.get('/pending-approvals', verifyAdmin, async (req, res) => {
  try {
    const pendingProducts = await Product.find({ 
      status: { $in: ['Pending', 'Pending Deletion'] } 
    }).populate('retailerId', 'shopName name');
    res.status(200).json(pendingProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching approvals' });
  }
});

// 5. APPROVE OR REJECT PRODUCT ADDITION
router.put('/approve-product/:id', verifyAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    if (action === 'approve') {
      const updated = await Product.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
      res.status(200).json(updated);
    } else {
      await Product.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: 'Product rejected and removed' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error processing approval' });
  }
});

// 6. APPROVE PRODUCT DELETION
router.delete('/approve-deletion/:id', verifyAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product deletion approved and removed from database' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing deletion' });
  }
});

module.exports = router;
