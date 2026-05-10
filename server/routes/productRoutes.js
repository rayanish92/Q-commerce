const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyToken, verifyRetailerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. ADD A PRODUCT (Defaults to Pending)
router.post('/add', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      retailerId: req.user.id,
      status: 'Pending' // Requires admin approval
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ message: 'Error adding product', error: err.message });
  }
});

// 2. RETAILER VIEW: GET MY PRODUCTS (Shows all statuses)
router.get('/me', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const myProducts = await Product.find({ retailerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(myProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// 3. UPDATE QUANTITY
router.put('/update/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, { $set: { quantity: req.body.quantity } }, { new: true }
    );
    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: 'Error updating quantity' });
  }
});

// 4. REQUEST DELETION (Changes status to Pending Deletion)
router.delete('/delete/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id, { status: 'Pending Deletion' }, { new: true }
    );
    res.status(200).json({ message: 'Sent to Admin for deletion approval', product: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error requesting deletion' });
  }
});

// 5. CUSTOMER VIEW: GET NEARBY APPROVED PRODUCTS
router.get('/nearby', verifyToken, async (req, res) => {
  try {
    const { lng, lat, category } = req.query;
    if (!lng || !lat) return res.status(400).json({ message: "Location required" });

    const nearbyRetailers = await User.find({
      role: 'retailer',
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 10000 
        }
      }
    });

    const retailerIds = nearbyRetailers.map(r => r._id);

    // Build the query: Must belong to nearby retailer, have stock, and be APPROVED
    const query = {
      retailerId: { $in: retailerIds },
      status: 'Approved',
      quantity: { $gt: 0 }
    };
    
    // Add category filter if the customer selected one
    if (category && category !== 'All') {
      query.category = category;
    }

    const nearbyProducts = await Product.find(query).populate('retailerId', 'shopName');
    res.status(200).json(nearbyProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

module.exports = router;
