const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyRetailerOrAdmin, verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

const findNearestRetailerForItems = async (items, lng, lat, excludeRetailerIds = []) => {
  const nearbyRetailers = await User.find({ role: 'retailer', _id: { $nin: excludeRetailerIds }, location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 15000 } } });
  let allocations = {}, unallocated = [];

  for (let item of items) {
    let allocated = false;
    for (let retailer of nearbyRetailers) {
      const productRecord = await Product.findOne({ retailerId: retailer._id, name: item.name, status: 'Approved', quantity: { $gte: item.cartQty } });
      if (productRecord) {
        if (!allocations[retailer._id]) allocations[retailer._id] = [];
        allocations[retailer._id].push(item);
        // Stock is conditionally held; deducted on acceptance
        allocated = true;
        break; 
      }
    }
    if (!allocated) unallocated.push(item);
  }
  return { allocations, unallocated };
};

router.post('/create', verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, deliveryAddress, lat, lng } = req.body;
    const { allocations, unallocated } = await findNearestRetailerForItems(items, lng, lat, []);
    
    if (Object.keys(allocations).length === 0) return res.status(400).json({ message: 'Items not available nearby.' });

    let subOrders = [];
    for (const [retailerId, retailItems] of Object.entries(allocations)) subOrders.push({ retailerId, items: retailItems, status: 'Pending' });

    const newOrder = new Order({
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerId: req.user.id, totalAmount, paymentMethod, deliveryAddress,
      location: { type: 'Point', coordinates: [lng, lat] },
      subOrders, status: unallocated.length > 0 ? 'Partially Placed' : 'Order Placed'
    });
    
    await newOrder.save();
    res.status(201).json({ order: newOrder, unallocated });
  } catch (err) { res.status(500).json({ message: 'Failed to place order' }); }
});

router.get('/my-orders', verifyToken, async (req, res) => {
  try { res.status(200).json(await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 })); } 
  catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

router.get('/retailer-orders', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ "subOrders.retailerId": req.user.id }).sort({ createdAt: -1 });
    const filteredOrders = orders.map(order => ({
      _id: order._id, orderId: order.orderId, createdAt: order.createdAt, deliveryAddress: order.deliveryAddress,
      subOrder: order.subOrders.find(sub => sub.retailerId.toString() === req.user.id)
    })).filter(o => o.subOrder);
    res.status(200).json(filteredOrders);
  } catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

router.put('/:orderId/suborder/:subOrderId', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { action } = req.body;
    const order = await Order.findById(req.params.orderId);
    const subOrder = order.subOrders.id(req.params.subOrderId);

    if (action === 'Accept') {
      subOrder.status = 'Accepted';
      order.status = 'Accepted by Store';
      // DEDUCT STOCK
      for (let item of subOrder.items) {
        const productRecord = await Product.findOne({ retailerId: req.user.id, name: item.name });
        if (productRecord) {
          productRecord.quantity = Math.max(0, productRecord.quantity - item.cartQty);
          await productRecord.save();
        }
      }
    } else if (action === 'Reject') {
      subOrder.status = 'Rejected';
      const [lng, lat] = order.location.coordinates;
      const { allocations } = await findNearestRetailerForItems(subOrder.items, lng, lat, [req.user.id]);
      if (Object.keys(allocations).length > 0) {
        for (const [newRetailerId, newItems] of Object.entries(allocations)) order.subOrders.push({ retailerId: newRetailerId, items: newItems, status: 'Pending' });
      }
    }
    await order.save();
    res.status(200).json({ message: `Order ${action}ed` });
  } catch (err) { res.status(500).json({ message: 'Error updating order' }); }
});

router.get('/all-orders', verifyAdmin, async (req, res) => {
  try {
    const { retailerId, startDate, endDate, location } = req.query;
    let query = {};
    if (startDate && endDate) query.createdAt = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59)) };
    if (retailerId) query['subOrders.retailerId'] = retailerId;
    if (location) query.deliveryAddress = { $regex: location, $options: 'i' };

    const orders = await Order.find(query)
      .populate('customerId', 'name email contactNumber')
      .populate('subOrders.retailerId', 'shopName location')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) { res.status(500).json({ message: 'Error fetching global orders' }); }
});

module.exports = router;
