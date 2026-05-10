const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String, default: '' }, // NEW: Added Contact Number
  role: {
    type: String,
    enum: ['admin', 'retailer', 'customer', 'delivery_agent'],
    default: 'customer'
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  shopName: { type: String, default: '' },
  retailerCategory: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

UserSchema.index({ location: "2dsphere" });
module.exports = mongoose.model('User', UserSchema);
