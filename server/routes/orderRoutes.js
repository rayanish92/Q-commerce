const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyRetailerOrAdmin, verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper: Haversine Distance Formula
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
// FIXED AUTO-ASSIGNMENT WITH DEBUG LOGS
// =========================================================
const autoAssignAgent = async (order, retailerId) => {
  try {
    const retailer = await User.findById(retailerId);
    if (!retailer || !retailer.location || !retailer.location.coordinates) {
      console.log("Auto-Assign Skip: Retailer has no GPS coordinates set.");
      return false;
    }

    const [lng, lat] = retailer.location.coordinates;
    console.log(`Auto-Assigning for Retailer at: ${lat}, ${lng}`);

    // Search for nearest delivery_agent who is isOnline: true
    const nearestAgent = await User.findOne({
      role: 'delivery_agent',
      isOnline: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 10000 // Increased to 10km for easier testing
        }
      }
    });

    if (nearestAgent) {
      console.log(`Success: Found Agent ${nearestAgent.name} within 10km.`);
      order.deliveryAgent = nearestAgent._id;
      order.status = 'Assigned';
      order.subOrders.forEach(sub => { sub.status = 'Assigned'; });
      await User.findByIdAndUpdate(nearestAgent._id, { $inc: { activeDeliveries: 1 } });
      return true;
    } else {
      console.log("Auto-Assign Failed: No ONLINE delivery agents found within 10km.");
      return false;
    }
  } catch (err) {
    console.error("CRITICAL AUTO-ASSIGN ERROR:", err);
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
    let fee = 25;
    if (maxDist > 3) fee += Math.ceil(maxDist - 3) * 1;
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
      subOrders, status: finalStatus
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
        // Auto-assignment happens here
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
    const orders = await Order.find().populate('customerId', 'name').populate('subOrders.retailerId', 'shopName').sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) { res.status(500).json({ message: 'Error fetching global orders' }); }
});

// AGENT ROUTES
router.put('/agent/status', verifyToken, async (req, res) => {
  try {
    const { isOnline, lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user.id, { isOnline, location: { type: 'Point', coordinates: [lng, lat] } });
    res.status(200).json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.put('/:orderId/assign', verifyAdmin, async (req, res) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findById(req.params.orderId);
    order.deliveryAgent = agentId;
    order.status = 'Assigned';
    order.subOrders.forEach(s => s.status = 'Assigned');
    await order.save();
    await User.findByIdAndUpdate(agentId, { $inc: { activeDeliveries: 1 } });
    res.status(200).json({ message: 'Assigned' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.get('/agent-deliveries', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ deliveryAgent: req.user.id }).populate('customerId').populate('subOrders.retailerId').sort({ createdAt: -1 });
    const mapped = orders.map(o => {
      const obj = o.toObject();
      obj.retailerId = obj.subOrders[0]?.retailerId;
      return obj;
    });
    res.status(200).json(mapped);
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.put('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);
    order.status = status;
    if (status === 'Delivered') {
      order.subOrders.forEach(s => s.status = 'Delivered');
      await User.findByIdAndUpdate(order.deliveryAgent, { $inc: { activeDeliveries: -1 } });
    }
    await order.save();
    res.status(200).json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

module.exports = router;
