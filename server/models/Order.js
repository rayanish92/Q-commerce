const mongoose = require('mongoose');

// A sub-order goes to a specific retailer
const SubOrderSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: Array, // { name, quantity, price, masterProductId }
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Shipped', 'Delivered'], default: 'Pending' },
  deliveryAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  
  // The customer's GPS coordinates at time of order (used for routing/re-routing)
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  
  // The split orders
  subOrders: [SubOrderSchema],
  
  // Overall status shown to customer
  status: { type: String, default: 'Order Placed' }
}, { timestamps: true });

OrderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('Order', OrderSchema);
