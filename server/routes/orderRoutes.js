const express = require('express');
const Order = require('../models/Order');
const { verifyRetailerOrAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Retailer fetches their orders
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
  } catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

// CUSTOMER PLACES AN ORDER
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { retailerId, items, totalAmount, paymentMethod, deliveryAddress } = req.body;
    
    const newOrder = new Order({
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerId: req.user.id,
      retailerId,
      items,
      totalAmount,
      paymentMethod,
      deliveryAddress
    });
    
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) { 
    res.status(500).json({ message: 'Failed to place order' }); 
  }
});

// CUSTOMER FETCHES THEIR PAST ORDERS
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

router.post('/generate-dummy', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const newOrder = new Order({
      orderId: `ORD-${Math.floor(Math.random() * 1000000)}`,
      customerId: req.user.id, // using self as dummy customer
      retailerId: req.user.id,
      items: [{ name: 'Dummy Item', quantity: 1, price: 100 }],
      totalAmount: Math.floor(Math.random() * 500) + 50,
      paymentMethod: 'COD',
      deliveryAddress: 'Test Location'
    });
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) { res.status(500).json({ message: 'Error generating order' }); }
});

module.exports = router;
