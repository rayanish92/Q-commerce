const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { verifyRetailerOrAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Helper Function: Find nearest retailer with stock
const findNearestRetailerForItems = async (items, lng, lat, excludeRetailerIds = []) => {
  const nearbyRetailers = await User.find({
    role: 'retailer',
    _id: { $nin: excludeRetailerIds },
    location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 15000 } }
  });

  let allocations = {}; // { retailerId: [items] }
  let unallocated = [];

  for (let item of items) {
    let allocated = false;
    // Search retailers in order of proximity
    for (let retailer of nearbyRetailers) {
      // Find the product in this retailer's inventory by Name
      const productRecord = await Product.findOne({
        retailerId: retailer._id,
        name: item.name,
        status: 'Approved',
        quantity: { $gte: item.cartQty }
      });

      if (productRecord) {
        if (!allocations[retailer._id]) allocations[retailer._id] = [];
        allocations[retailer._id].push(item);
        
        // Temporarily hold stock (Optional: strictly decrement here in prod)
        productRecord.quantity -= item.cartQty;
        await productRecord.save();
        
        allocated = true;
        break; // Move to next item in cart
      }
    }
    if (!allocated) unallocated.push(item);
  }
  return { allocations, unallocated };
};

// HELPER: Assign nearest Delivery Agent
const assignDeliveryAgent = async (retailerId) => {
  const retailer = await User.findById(retailerId);
  const agent = await User.findOne({
    role: 'delivery_agent',
    isAvailable: true,
    location: { $near: { $geometry: { type: "Point", coordinates: retailer.location.coordinates }, $maxDistance: 10000 } }
  });
  return agent ? agent._id : null;
};

// 1. CUSTOMER CHECKOUT (SMART ROUTING)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, deliveryAddress, lat, lng } = req.body;
    
    // 1. Run the assignment algorithm
    const { allocations, unallocated } = await findNearestRetailerForItems(items, lng, lat, []);
    
    if (Object.keys(allocations).length === 0) {
      return res.status(400).json({ message: 'Sorry, none of these items are available nearby right now.' });
    }

    // 2. Build Sub-Orders
    let subOrders = [];
    for (const [retailerId, retailItems] of Object.entries(allocations)) {
      subOrders.push({
        retailerId,
        items: retailItems,
        status: 'Pending'
      });
    }

    // 3. Create Main Order
    const newOrder = new Order({
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      customerId: req.user.id,
      totalAmount,
      paymentMethod,
      deliveryAddress,
      location: { type: 'Point', coordinates: [lng, lat] },
      subOrders,
      status: unallocated.length > 0 ? 'Partially Placed' : 'Order Placed'
    });
    
    await newOrder.save();
    res.status(201).json({ order: newOrder, unallocated });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ message: 'Failed to place order' }); 
  }
});

// 2. CUSTOMER FETCHES THEIR ORDERS
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

// 3. RETAILER FETCHES THEIR SUB-ORDERS
router.get('/retailer-orders', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let matchQuery = { "subOrders.retailerId": req.user.id };

    if (startDate && endDate) {
      matchQuery.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(new Date(endDate).setHours(23, 59, 59)) 
      };
    }
    
    // Find orders that contain a subOrder for this retailer
    const orders = await Order.find(matchQuery).sort({ createdAt: -1 });
    
    // Filter out other retailers' subOrders before sending to frontend
    const filteredOrders = orders.map(order => {
      const mySubOrder = order.subOrders.find(sub => sub.retailerId.toString() === req.user.id);
      return {
        _id: order._id,
        orderId: order.orderId,
        createdAt: order.createdAt,
        deliveryAddress: order.deliveryAddress,
        subOrder: mySubOrder
      };
    }).filter(o => o.subOrder);

    res.status(200).json(filteredOrders);
  } catch (err) { res.status(500).json({ message: 'Error fetching orders' }); }
});

// 4. RETAILER ACCEPTS OR REJECTS ORDER
router.put('/:orderId/suborder/:subOrderId', verifyRetailerOrAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'Accept' or 'Reject'
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const subOrder = order.subOrders.id(req.params.subOrderId);
    if (!subOrder) return res.status(404).json({ message: 'SubOrder not found' });

    if (action === 'Accept') {
      subOrder.status = 'Accepted';
      order.status = 'Accepted by Store';
      // Find Delivery Agent
      const agentId = await assignDeliveryAgent(req.user.id);
      if (agentId) subOrder.deliveryAgentId = agentId;
      
    } else if (action === 'Reject') {
      subOrder.status = 'Rejected';
      
      // AUTO-REASSIGNMENT LOGIC
      // Find the next nearest retailer for these items
      const [lng, lat] = order.location.coordinates;
      const { allocations } = await findNearestRetailerForItems(subOrder.items, lng, lat, [req.user.id]);
      
      if (Object.keys(allocations).length > 0) {
        for (const [newRetailerId, newItems] of Object.entries(allocations)) {
          order.subOrders.push({
            retailerId: newRetailerId,
            items: newItems,
            status: 'Pending'
          });
        }
      } else {
         // No one else has it. Need to refund customer or mark unfulfilled.
         // (Simplified for now)
      }
    }

    await order.save();
    res.status(200).json({ message: `Order ${action}ed` });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ message: 'Error updating order' }); 
  }
});

module.exports = router;
