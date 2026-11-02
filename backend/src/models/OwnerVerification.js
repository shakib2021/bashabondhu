const mongoose = require('mongoose');

const ownerVerificationSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  nidName: { type: String, required: true, trim: true, maxlength: 255 },
  nidNumber: { type: String, required: true, match: /^(?:\d{10}|\d{13}|\d{17})$/ },
  frontImage: { type: Buffer, required: true },
  frontMimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
  backImage: { type: Buffer, required: true },
  backMimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', required: true },
  rejectionReason: { type: String, default: '', maxlength: 500 },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('OwnerVerification', ownerVerificationSchema);
