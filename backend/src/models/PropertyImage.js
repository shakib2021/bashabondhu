const mongoose = require('mongoose');

const propertyImageSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accommodation', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  data: { type: Buffer, required: true },
  mimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
}, { timestamps: true });

module.exports = mongoose.model('PropertyImage', propertyImageSchema);
