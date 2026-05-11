const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'retailer', 'delivery_agent', 'admin'], default: 'customer' },
  contactNumber: { type: String },
  
  // Retailer Specific
  shopName: { type: String },
  retailerCategory: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  
  // CRITICAL FIX: Explicitly defined all the new address fields so MongoDB stops deleting them!
  addresses: [{
    label: String,
    contactName: String,
    phoneNumber: String,
    address: String,
    landmark: String,
    pincode: String,
    lat: Number,
    lng: Number
  }],
  
  bankDetails: {
    accountName: String,
    accountNumber: String,
    ifscCode: String
  }
}, { timestamps: true });

// Required for Geospatial (Distance) Queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
