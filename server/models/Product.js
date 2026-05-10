const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  masterProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterProduct', default: null }, // Null if it's a custom product
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  imageUrl: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Pending Deletion'], 
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
