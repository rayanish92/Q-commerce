const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyToken, verifyRetailerOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/add', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const newProduct = new Product({ ...req.body, retailerId: req.user.id, status: 'Pending' });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) { res.status(500).json({ message: 'Error adding product' }); }
});

router.get('/me', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const myProducts = await Product.find({ retailerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(myProducts);
  } catch (err) { res.status(500).json({ message: 'Error fetching products' }); }
});

router.put('/update-quantity/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, { quantity: req.body.quantity }, { new: true });
    res.status(200).json(updatedProduct);
  } catch (err) { res.status(500).json({ message: 'Error updating quantity' }); }
});

router.put('/request-price-change/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, { retailerPrice: req.body.newPrice, status: 'Price Update Pending' }, { new: true });
    res.status(200).json(updated);
  } catch (err) { res.status(500).json({ message: 'Error requesting price change' }); }
});

router.delete('/delete/:id', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, { status: 'Pending Deletion' }, { new: true });
    res.status(200).json({ message: 'Sent to Admin for deletion approval', product: updated });
  } catch (err) { res.status(500).json({ message: 'Error requesting deletion' }); }
});

// CUSTOMER VIEW (WITH TEST MODE OVERRIDE)
router.get('/nearby', verifyToken, async (req, res) => {
  try {
    const { lng, lat, category, testMode } = req.query;
    let query = { status: 'Approved', quantity: { $gt: 0 } };
    
    if (category && category !== 'All') query.category = category;

    // IF TEST MODE IS ON: Ignore GPS and return ALL approved products
    if (testMode === 'true') {
      const allProducts = await Product.find(query).populate('retailerId', 'shopName location');
      return res.status(200).json(allProducts);
    }

    // STRICT LOCATION MODE: 10km Radius
    if (!lng || !lat) return res.status(400).json({ message: "Location required" });
    const nearbyRetailers = await User.find({
      role: 'retailer',
      location: { $near: { $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: 10000 } }
    });
    
    const retailerIds = nearbyRetailers.map(r => r._id);
    query.retailerId = { $in: retailerIds };
    
    const nearbyProducts = await Product.find(query).populate('retailerId', 'shopName location');
    res.status(200).json(nearbyProducts);
  } catch (err) { res.status(500).json({ message: 'Error fetching products' }); }
});

module.exports = router;
