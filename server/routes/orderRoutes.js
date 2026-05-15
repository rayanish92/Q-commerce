const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyRetailerOrAdmin, verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper: Haversine Distance Formula (calculates KM between two GPS coordinates)
const calcDist = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
};

const findNearestRetailerForItems = async (items, lng, lat, excludeRetailerIds = []) => {
  const nearbyRetailers = await User.find({ 
    role: 'retailer', 
    _id: { $nin: excludeRetailerIds }, 
    location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 15000 } } 
  });
  
  let allocations = {}, unallocated = [];

  for (let item of items) {
    let allocated = false;
    const requestedQty = Number(item.cartQty || item.quantity || 1);

    for (let retailer of nearbyRetailers) {
      const productRecord = await Product.findOne({ retailerId: retailer._id, name: item.name, status: 'Approved', quantity: { $gte: requestedQty } });
      if (productRecord) {
        if (!allocations[retailer._id]) allocations[retailer._id] = [];
        allocations[retailer._id].push(item);
        allocated = true; break; 
      }
    }
    if (!allocated) unallocated.push(item);
  }
  return { allocations, unallocated };
};

// =========================================================
// NEW: AUTO-ASSIGNMENT ALGORITHM
// =========================================================
const autoAssignAgent = async (order, retailerId) => {
  try {
    const retailer = await User.findById(retailerId);
    if (!retailer || !retailer.location) return false;

    const [lng, lat] = retailer.location.coordinates;

    // Find the nearest ONLINE agent within 5km (5000 meters)
    const nearestAgent = await User.findOne({
      role: 'delivery_agent',
      isOnline: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 5000 
        }
      }
    });

    if (nearestAgent) {
      order.deliveryAgent = nearestAgent._id;
      order.status = 'Assigned';
      // Optional: Increase agent's active load
      nearestAgent.activeDeliveries = (nearestAgent.activeDeliveries || 0) + 1;
      await nearestAgent.save();
      return true;
    }
    return false; // No agents nearby or online
  } catch (err) {
    console.error("Auto-assign algorithm failed:", err);
    return false;
  }
};

// DYNAMIC FEE ESTIMATOR
router.post('/estimate-fee', verifyToken, async (req, res) => {
  try {
    const { items, lat, lng } = req.body;
    const { allocations } = await findNearestRetailerForItems(items, lng, lat, []);
    
    if (Object.keys(allocations).length === 0) return res.json({ fee: 0, possible: false });
    
    let maxDist = 0;
    for (const rId of Object.keys(allocations)) {
       const retailer = await User.findById(rId);
       if (retailer && retailer.location) {
         const d = calcDist(lat, lng, retailer.location.coordinates[1], retailer.location.coordinates[0]);
         if (d > maxDist) maxDist = d;
       }
    }
    
    let fee = 25; // Base fee for 0-3km
    if (maxDist > 3) fee += Math.ceil(maxDist - 3) * 1; // +1 Rupee per extra KM
    
    res.json({ fee, possible: true });
  } catch(err) { res.status(500).json({fee: 25, possible: false}); }
});

router.post('/create', verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, deliveryAddress, lat, lng } = req.body;
    const { allocations, unallocated } = await findNearestRetailerForItems(items, lng, lat, []);
    
    let subOrders = [];
    for (const [retailerId, retailItems] of Object.entries(allocations)) {
      subOrders.push({ retailerId, items: retailItems, status: 'Pending' });
    }

    let finalStatus = 'Order Placed';
    if (unallocated.length > 0 && subOrders.length > 0) finalStatus = 'Partially Placed';
    if (subOrders.length === 0) finalStatus = 'Cancelled - No Nearby Stock';

    const newOrder = new Order({
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerId: req.user.id, 
      totalAmount, paymentMethod, deliveryAddress,
      location: { type: 'Point', coordinates: [lng, lat] },
      subOrders, 
      status: finalStatus
    });
    
    await newOrder.save();
    
    if (finalStatus.includes('Cancelled')) {
      return res.status(400).json({ message: 'Order Cancelled: Items not available nearby.', order: newOrder });
    }

    res.status(201).json({ order: newOrder, unallocated });
  } catch (err) { res.status(500).json({ message: 'Failed to place order' }); }
});

router.get('/my-orders', verifyToken, async (req, res) => {
  try { res.status(200).json(await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 })); } 
  catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

router.get('/retailer-orders', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let matchQuery = { "subOrders.retailerId": req.user.id };
    if (startDate && endDate) matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59)) };
    const orders = await Order.find(matchQuery).sort({ createdAt: -1 });
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
      const allResolved = order.subOrders.every(s => s.status !== 'Pending');
      
      if (allResolved) {
        order.status = 'Accepted by Store';
        // TRIGGER AUTO-ASSIGNMENT HERE!
        await autoAssignAgent(order, req.user.id); 
      }

      for (let item of subOrder.items) {
        const qtyToDeduct = Number(item.cartQty || item.quantity || 1);
        await Product.findOneAndUpdate({ retailerId: req.user.id, name: item.name }, { $inc: { quantity: -qtyToDeduct } });
      }
    } else if (action === 'Reject') {
      subOrder.status = 'Rejected';
      const [lng, lat] = order.location.coordinates;
      const { allocations } = await findNearestRetailerForItems(subOrder.items, lng, lat, [req.user.id]);
      
      if (Object.keys(allocations).length > 0) {
        for (const [newRetailerId, newItems] of Object.entries(allocations)) {
          order.subOrders.push({ retailerId: newRetailerId, items: newItems, status: 'Pending' });
        }
      } else {
        const allResolved = order.subOrders.every(s => s.status !== 'Pending');
        if (allResolved) order.status = 'Cancelled - Rejected by Store';
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
    const orders = await Order.find(query).populate('customerId', 'name email contactNumber').populate('subOrders.retailerId', 'shopName location').sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) { res.status(500).json({ message: 'Error fetching global orders' }); }
});

// =========================================================
// AGENT AND DELIVERY LOGIC
// =========================================================

// Agent Toggles Online/Offline Status and updates GPS location
router.put('/agent/status', verifyToken, async (req, res) => {
  try {
    const { isOnline, lat, lng } = req.body;
    const agent = await User.findById(req.user.id);
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    agent.isOnline = isOnline;
    if (lat && lng) {
      agent.location = { type: 'Point', coordinates: [lng, lat] };
    }
    
    await agent.save();
    res.status(200).json({ message: 'Status updated', isOnline: agent.isOnline });
  } catch (err) {
    res.status(500).json({ message: 'Error updating agent status' });
  }
});

// Admin manually assigns an order to a delivery agent
router.put('/:orderId/assign', verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { agentId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.deliveryAgent = agentId;
    order.status = 'Assigned';
    await order.save();
    res.status(200).json({ message: 'Agent assigned successfully!', order });
  } catch (err) { res.status(500).json({ message: 'Error assigning agent' }); }
});

// Agent fetches their specific assigned deliveries
router.get('/agent-deliveries', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ deliveryAgent: req.user.id })
      .populate('customerId', 'name address contactNumber')
      .populate('subOrders.retailerId', 'shopName address location contactNumber')
      .sort({ createdAt: -1 });

    const mappedOrders = orders.map(order => {
      const o = order.toObject();
      o.retailerId = o.subOrders && o.subOrders.length > 0 ? o.subOrders[0].retailerId : null;
      return o;
    });

    res.status(200).json(mappedOrders);
  } catch (err) { res.status(500).json({ message: 'Error fetching agent deliveries' }); }
});

// Agent updates the order status (Picked Up -> Delivered)
router.put('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    if (status === 'Delivered') {
      order.subOrders.forEach(sub => sub.status = 'Delivered');
      // Free up the agent's active load so they can take more orders
      await User.findByIdAndUpdate(order.deliveryAgent, { $inc: { activeDeliveries: -1 } });
    }

    await order.save();
    res.status(200).json({ message: `Order status updated to ${status}`, order });
  } catch (err) { res.status(500).json({ message: 'Error updating order status' }); }
});

module.exports = router;
