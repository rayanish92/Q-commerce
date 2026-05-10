const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  masterProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterProduct', default: null },
  name: { type: String, required: true },
  description: { type: String },
  retailerPrice: { type: Number, required: true }, // What the retailer asks for
  sellingPrice: { type: Number, default: 0 },      // What the admin sets for customers
  quantity: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  imageUrl: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Pending Deletion', 'Price Update Pending'], 
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
