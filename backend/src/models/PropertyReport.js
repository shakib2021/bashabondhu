const mongoose = require('mongoose');

const propertyReportSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Accommodation',
    required: true,
    index: true,
  },
  propertyTitle: { type: String, required: true, trim: true, maxlength: 255 },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: [
      'scam',
      'sexual-content',
      'violence',
      'discrimination',
      'misleading-information',
      'unsafe-property',
      'duplicate-listing',
      'other',
    ],
    required: true,
  },
  details: { type: String, default: '', trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('PropertyReport', propertyReportSchema);
