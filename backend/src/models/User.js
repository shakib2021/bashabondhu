const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['comment', 'reply', 'contact-request', 'contact-request-decision'], required: true },
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 300 },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accommodation', required: true },
  propertyTitle: { type: String, required: true, maxlength: 255 },
  commentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  replyId: { type: mongoose.Schema.Types.ObjectId, default: null },
  contactRequestId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isRead: { type: Boolean, default: false },
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
  profileImage: {
    type: String,
    default: null,
    maxlength: 1000,
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
  notifications: { type: [notificationSchema], default: [] },
  role: {
    type: String,
    enum: ['tenant', 'owner', 'admin'],
    default: 'tenant',
    required: true,
  },
  authProvider: {
    type: String,
    enum: ['google'],
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
