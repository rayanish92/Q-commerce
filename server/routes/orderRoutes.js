const express = require('express');
const Order = require('../models/Order');
const { verifyRetailerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Fetch orders for a specific retailer with date filters
router.get('/retailer-orders', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { retailerId: req.user.id };

    if (startDate && endDate) {
      query.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(new Date(endDate).setHours(23, 59, 59)) 
      };
    }
    
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Dummy route to generate a test order
router.post('/generate-dummy', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const newOrder = new Order({
      orderId: `ORD-${Math.floor(Math.random() * 1000000)}`,
      retailerId: req.user.id,
      totalAmount: Math.floor(Math.random() * 500) + 50
    });
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) { res.status(500).json({ message: 'Error generating order' }); }
});

module.exports = router;
