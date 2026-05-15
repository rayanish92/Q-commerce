const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['customer', 'retailer', 'delivery_agent', 'admin'], 
    default: 'customer' 
  },
  contactNumber: { 
    type: String 
  },
  
  // --- RETAILER SPECIFIC FIELDS ---
  shopName: { 
    type: String 
  },
  retailerCategory: { 
    type: String 
  },
  
  // --- GEOSPATIAL LOCATION (Used by Customers, Retailers, and Agents) ---
  address: { 
    type: String 
  },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      default: [0, 0] // [longitude, latitude]
    }
  },

  // --- DELIVERY AGENT SPECIFIC FIELDS ---
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  activeDeliveries: { 
    type: Number, 
    default: 0 
  },
  totalEarnings: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true 
});

// CRITICAL: This index allows MongoDB to calculate distances for auto-assigning agents!
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
