const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Completed' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
