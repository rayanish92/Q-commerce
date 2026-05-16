const mongoose = require('mongoose');

// Define the schema for individual retailer sub-orders
const subOrderSchema = new mongoose.Schema({
  retailerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [
    {
      name: String,
      price: Number,
      retailerPrice: Number,
      cartQty: Number,
      quantity: Number // Added for backwards compatibility if needed
    }
  ],
  status: { 
    type: String, 
    // CRITICAL FIX: The Whitelist! Added Assigned, Picked_Up, and Delivered
    enum: ['Pending', 'Accepted', 'Rejected', 'Assigned', 'Picked_Up', 'Delivered'], 
    default: 'Pending' 
  }
});

// Define the schema for the main Customer Order
const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  deliveryAgent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Links the order to the Fleet App agent
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    default: 'COD' 
  },
  deliveryAddress: { 
    type: String, 
    required: true 
  },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      required: true // [longitude, latitude]
    }
  },
  subOrders: [subOrderSchema],
  
  // Notice there is no enum here, so it safely accepts all of our dynamic messages
  // like 'Accepted by Store' or 'Cancelled - No Nearby Stock'
  status: { 
    type: String, 
    default: 'Order Placed' 
  }
}, { 
  timestamps: true 
});

// Add a 2dsphere index just in case we ever want to search for orders by location
orderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);
