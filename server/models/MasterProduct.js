const mongoose = require('mongoose');

const MasterProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  imageUrl: { type: String, default: '' }, // FIX: Removed 'required: true' to make it optional
}, { timestamps: true });

module.exports = mongoose.model('MasterProduct', MasterProductSchema);
