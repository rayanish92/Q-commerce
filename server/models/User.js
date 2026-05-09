const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'customer', 'retailer', 'delivery_agent'], 
    default: 'customer' 
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  shopName: String, // Only for retailers
  isAvailable: { type: Boolean, default: true } // For delivery agents
});

UserSchema.index({ location: "2dsphere" });
module.exports = mongoose.model('User', UserSchema);
