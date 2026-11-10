const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true, trim: true, maxlength: 255 },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

const replySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  author: { type: String, required: true, trim: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  author: { type: String, required: true, trim: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  replies: { type: [replySchema], default: [] },
});

const imageSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  data: { type: Buffer, required: true },
  mimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
});

const marketplaceItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 1 },
  condition: { type: String, enum: ['New', 'Like new', 'Good', 'Fair'], required: true },
  location: { type: String, required: true, trim: true, maxlength: 255 },
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerName: { type: String, required: true, trim: true, maxlength: 255 },
  images: { type: [imageSchema], default: [] },
  offers: { type: [offerSchema], default: [] },
  comments: { type: [commentSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema);
