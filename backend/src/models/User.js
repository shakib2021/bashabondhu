const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'comment',
      'reply',
      'contact-request',
      'contact-request-decision',
      'visit-request',
      'visit-request-decision',
      'admin-warning',
      'marketplace-offer',
      'marketplace-offer-decision',
    ],
    required: true,
  },
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 300 },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accommodation', default: null },
  propertyTitle: { type: String, default: '', maxlength: 255 },
  marketplaceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem', default: null },
  itemTitle: { type: String, default: '', maxlength: 255 },
  commentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  replyId: { type: mongoose.Schema.Types.ObjectId, default: null },
  contactRequestId: { type: mongoose.Schema.Types.ObjectId, default: null },
  visitRequestId: { type: mongoose.Schema.Types.ObjectId, default: null },
  visitAt: { type: Date, default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const warningSchema = new mongoose.Schema({
  reason: { type: String, required: true, trim: true, maxlength: 300 },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255,
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },
  profileImage: {
    type: String,
    default: null,
    maxlength: 1000,
  },
  profileImageData: { type: Buffer, select: false },
  profileImageMimeType: {
    type: String,
    enum: ['image/jpeg', 'image/png', 'image/webp'],
    select: false,
  },
  phone: {
    type: String,
    default: null,
    maxlength: 30,
  },
  address: {
    type: String,
    default: null,
    maxlength: 500,
  },
  occupation: {
    type: String,
    default: null,
    maxlength: 150,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  ownerVerificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'rejected', 'approved'],
    default: 'unverified',
  },
  notifications: { type: [notificationSchema], default: [] },
  warnings: { type: [warningSchema], default: [] },
  warningCount: { type: Number, default: 0, min: 0 },
  watchlist: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Accommodation' }], default: [] },
  role: {
    type: String,
    enum: ['tenant', 'owner', 'admin'],
    default: 'tenant',
    required: true,
  },
  authProvider: {
    type: String,
    enum: ['google', 'firebase'],
    default: 'google',
    required: true,
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'disabled'],
    default: 'active',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
