const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true, trim: true, maxlength: 255 },
  unreadCount: { type: Number, default: 0, min: 0 },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  conversationKey: { type: String, required: true, unique: true },
  listingType: { type: String, enum: ['property', 'marketplace'], required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  listingTitle: { type: String, required: true, trim: true, maxlength: 255 },
  participants: { type: [participantSchema], required: true, validate: (items) => items.length === 2 },
  lastMessage: { type: String, default: '' },
}, { timestamps: true });

conversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
