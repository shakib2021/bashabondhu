const mongoose = require('mongoose');

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

const contactRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterName: { type: String, required: true, trim: true, maxlength: 255 },
  requesterEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 255 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const accommodationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  accommodation_type: { type: String, required: true },
  city: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  monthly_rent: { type: Number, required: true, min: 0 },
  number_of_rooms: { type: Number, required: true, min: 1 },
  bedrooms: { type: Number, required: true, min: 1 },
  bathrooms: { type: Number, required: true, min: 1 },
  facilities: { type: [String], default: [] },
  images: { type: [String], default: [] },
  status: { type: String, enum: ['Available', 'Booked', 'Rented'], default: 'Available' },
  gender: { type: String, enum: ['men', 'women', 'any'], required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  rating: { type: Number, default: 0, min: 0 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comments: { type: [commentSchema], default: [] },
  contactRequests: { type: [contactRequestSchema], default: [] },
}, { timestamps: true, collection: 'accopost' });

module.exports = mongoose.model('Accommodation', accommodationSchema);