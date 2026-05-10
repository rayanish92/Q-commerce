const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyToken, verifyRetailerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// 1. ADD A NEW PRODUCT (Retailer/Admin only)
// ==========================================
router.post('/add', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      retailerId: req.user.id
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ message: 'Error adding product', error: err.message });
  }
});

// ==========================================
// 2. RETAILER VIEW: GET MY PRODUCTS
// ==========================================
router.get('/me', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const myProducts = await Product.find({ retailerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(myProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your products', error: err.message });
  }
});

// ==========================================
// 3. UPDATE PRODUCT QUANTITY/INFO
// ==========================================
router.put('/update/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true }
    );
    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
});

// ==========================================
// 4. DELETE A PRODUCT
// ==========================================
router.delete('/delete/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product has been deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
});

// ==========================================
// 5. CUSTOMER VIEW: GET NEARBY PRODUCTS (10km)
// ==========================================
router.get('/nearby', verifyToken, async (req, res) => {
  try {
    const { lng, lat } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: "Please provide longitude and latitude" });
    }

    const nearbyRetailers = await User.find({
      role: 'retailer',
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 10000 
        }
      }
    });

    const retailerIds = nearbyRetailers.map(retailer => retailer._id);

    const nearbyProducts = await Product.find({
      retailerId: { $in: retailerIds },
      isAvailable: true,
      quantity: { $gt: 0 }
    }).populate('retailerId', 'shopName');

    res.status(200).json(nearbyProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching nearby products', error: err.message });
  }
});

module.exports = router;
