const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'retailer', 'customer', 'delivery_agent'],
    default: 'customer'
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  shopName: { type: String, default: '' },
  retailerCategory: { type: String, default: '' }, // NEW: E.g., Groceries, Pharmacy, Electronics
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('User', UserSchema);
