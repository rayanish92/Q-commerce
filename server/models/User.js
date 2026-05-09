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
  // GPS Location for the 10km radius searches
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  // Specific to retailers
  shopName: { type: String, default: '' },
  // Specific to delivery agents
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

// This index is critical for MongoDB to do geographic (map) calculations
UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('User', UserSchema);
