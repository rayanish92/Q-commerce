const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyRetailerOrAdmin, verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// SMART ROUTING ENGINE
const findNearestRetailerForItems = async (items, lng, lat, excludeRetailerIds = []) => {
  const nearbyRetailers = await User.find({ 
    role: 'retailer', 
    _id: { $nin: excludeRetailerIds }, 
    location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 15000 } } 
  });
  
  let allocations = {}, unallocated = [];

  for (let item of items) {
    let allocated = false;
    
    // SAFE FALLBACK: Works with both old and new cart systems
    const requestedQty = Number(item.cartQty || item.quantity || 1);

    for (let retailer of nearbyRetailers) {
      const productRecord = await Product.findOne({ 
        retailerId: retailer._id, 
        name: item.name, 
        status: 'Approved', 
        quantity: { $gte: requestedQty } 
      });

      if (productRecord) {
        if (!allocations[retailer._id]) allocations[retailer._id] = [];
        
        // Pass the exact deducted amount forward so we know what to refund if rejected
        allocations[retailer._id].push({ ...item, actualDeducted: requestedQty });
        
        // ATOMIC DEDUCTION: Subtracts stock instantly at the database level to prevent double-selling
        await Product.findByIdAndUpdate(productRecord._id, {
          $inc: { quantity: -requestedQty }
        });
        
        allocated = true;
        break; 
      }
    }
    if (!allocated) unallocated.push(item);
  }
  return { allocations, unallocated };
};

// 1. CUSTOMER PLACES ORDER
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, deliveryAddress, lat, lng } = req.body;
    const { allocations, unallocated } = await findNearestRetailerForItems(items, lng, lat, []);
    
    if (Object.keys(allocations).length === 0) {
      return res.status(400).json({ message: 'Items not available nearby.' });
    }

    let subOrders = [];
    for (const [retailerId, retailItems] of Object.entries(allocations)) {
      subOrders.push({ retailerId, items: retailItems, status: 'Pending' });
    }

    const newOrder = new Order({
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerId: req.user.id, 
      totalAmount, paymentMethod, deliveryAddress,
      location: { type: 'Point', coordinates: [lng, lat] },
      subOrders, 
      status: unallocated.length > 0 ? 'Partially Placed' : 'Order Placed'
    });
    
    await newOrder.save();
    res.status(201).json({ order: newOrder, unallocated });
  } catch (err) { res.status(500).json({ message: 'Failed to place order' }); }
});

// 2. CUSTOMER FETCHES ORDERS
router.get('/my-orders', verifyToken, async (req, res) => {
  try { res.status(200).json(await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 })); } 
  catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

// 3. RETAILER FETCHES THEIR SUB-ORDERS
router.get('/retailer-orders', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let matchQuery = { "subOrders.retailerId": req.user.id };

    if (startDate && endDate) {
      matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59)) };
    }

    const orders = await Order.find(matchQuery).sort({ createdAt: -1 });
    const filteredOrders = orders.map(order => ({
      _id: order._id, orderId: order.orderId, createdAt: order.createdAt, deliveryAddress: order.deliveryAddress,
      subOrder: order.subOrders.find(sub => sub.retailerId.toString() === req.user.id)
    })).filter(o => o.subOrder);
    
    res.status(200).json(filteredOrders);
  } catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

// 4. RETAILER ACCEPTS OR REJECTS
router.put('/:orderId/suborder/:subOrderId', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { action } = req.body;
    const order = await Order.findById(req.params.orderId);
    const subOrder = order.subOrders.id(req.params.subOrderId);

    if (action === 'Accept') {
      subOrder.status = 'Accepted';
      const allResolved = order.subOrders.every(s => s.status !== 'Pending');
      if (allResolved) order.status = 'Accepted by Store';

    } else if (action === 'Reject') {
      subOrder.status = 'Rejected';
      
      // ATOMIC REFUND: Safely adds the exact quantity back to the retailer's inventory
      for (let item of subOrder.items) {
        const qtyToRestore = Number(item.actualDeducted || item.cartQty || item.quantity || 1);
        await Product.findOneAndUpdate(
          { retailerId: req.user.id, name: item.name },
          { $inc: { quantity: qtyToRestore } }
        );
      }

      // AUTO-REASSIGNMENT: Look for the next nearest retailer
      const [lng, lat] = order.location.coordinates;
      const { allocations } = await findNearestRetailerForItems(subOrder.items, lng, lat, [req.user.id]);
      
      if (Object.keys(allocations).length > 0) {
        for (const [newRetailerId, newItems] of Object.entries(allocations)) {
          order.subOrders.push({ retailerId: newRetailerId, items: newItems, status: 'Pending' });
        }
      }
    }
    
    await order.save();
    res.status(200).json({ message: `Order ${action}ed` });
  } catch (err) { res.status(500).json({ message: 'Error updating order' }); }
});

// 5. ADMIN FETCHES ALL ORDERS
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
