const mongoose = require('mongoose');

const MasterProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true }, // Admin must provide a photo
}, { timestamps: true });

module.exports = mongoose.model('MasterProduct', MasterProductSchema);
