const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: Array, required: true }, // Stores the cart
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  status: { type: String, default: 'Order Placed' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
