const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Accommodation = require('./models/Accommodation');
const User = require('./models/User');
const { createAuthenticate } = require('./middleware/authenticate');
const { getVerifiedGoogleUser } = require('./utils/googleAuth');
const { signAuthToken, verifyAuthToken } = require('./utils/authToken');
const { serializeUser } = require('./utils/serializeUser');

function createApp({
  UserModel = User,
  AccommodationModel = Accommodation,
  googleUserLookup = getVerifiedGoogleUser,
  tokenSigner = signAuthToken,
  tokenVerifier = verifyAuthToken,
  jwtSecret = process.env.JWT_SECRET,
  googleClientId = process.env.GOOGLE_CLIENT_ID,
  clientOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:3000',
} = {}) {
  const app = express();
  const allowedOrigins = new Set(clientOrigins.split(',').map((origin) => origin.trim()).filter(Boolean));
  const authenticate = createAuthenticate(tokenVerifier, jwtSecret);
  const saveNotification = async (recipientId, actor, notification, recipientRole) => {
    if (!recipientId || String(recipientId) === String(actor._id)) {
      return;
    }

    const query = { _id: recipientId, accountStatus: 'active' };
    if (recipientRole) query.role = recipientRole;
    await UserModel.findOneAndUpdate(
      query,
      { $push: { notifications: { $each: [notification], $slice: -100 } } },
      { new: true, runValidators: true },
    );
  };
  const notifyPropertyOwner = (property, actor, notification) => (
    saveNotification(property.ownerId, actor, notification, 'owner')
  );

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('This origin is not allowed by CORS.'));
    },
  }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok' });
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  app.post('/api/auth/google/register', authLimiter, async (req, res, next) => {
    try {
      const { accessToken, role } = req.body;
      if (!['tenant', 'owner'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be tenant or owner.',
        });
      }

      const googleUser = await googleUserLookup(accessToken, googleClientId);
      const existingUser = await UserModel.findOne({ email: googleUser.email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered.',
        });
      }

      const user = await UserModel.create({
        fullName: googleUser.fullName,
        email: googleUser.email,
        profileImage: googleUser.profileImage,
        role,
        isVerified: false,
        authProvider: 'google',
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
        user: serializeUser(user),
        token: tokenSigner(String(user._id), jwtSecret),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
      return next(error);
    }
  });

  app.post('/api/auth/google/login', authLimiter, async (req, res, next) => {
    try {
      const googleUser = await googleUserLookup(req.body.accessToken, googleClientId);
      const user = await UserModel.findOne({ email: googleUser.email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Account not found. Register first.',
        });
      }
      if (user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'This account is not active.',
        });
      }

      return res.json({
        success: true,
        message: 'Account found.',
        user: serializeUser(user),
        token: tokenSigner(String(user._id), jwtSecret),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/users/me', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      return res.json({ success: true, user: serializeUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/users/me', authenticate, async (req, res, next) => {
    try {
      const allowedFields = ['fullName', 'profileImage', 'phone', 'address', 'occupation'];
      const updates = {};
      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          updates[field] = req.body[field] === '' ? null : req.body[field];
        }
      }

      if (typeof updates.fullName === 'string') {
        updates.fullName = updates.fullName.trim();
        if (!updates.fullName) {
          return res.status(400).json({ success: false, message: 'Enter your full name.' });
        }
      }

      const user = await UserModel.findOneAndUpdate(
        { _id: req.userId, accountStatus: 'active' },
        { $set: updates },
        { new: true, runValidators: true },
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      return res.json({ success: true, user: serializeUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/users/me/notifications', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      const notifications = [...(user.notifications || [])]
        .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
        .map((notification) => ({
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          propertyId: notification.propertyId,
          propertyTitle: notification.propertyTitle,
          commentId: notification.commentId,
          replyId: notification.replyId,
          contactRequestId: notification.contactRequestId,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        }));

      return res.json({
        success: true,
        notifications,
        unreadCount: notifications.filter((notification) => !notification.isRead).length,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/users/me/notifications/:notificationId/read', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.notificationId)) {
        return res.status(404).json({ success: false, message: 'Notification not found.' });
      }

      const user = await UserModel.findOneAndUpdate(
        { _id: req.userId, accountStatus: 'active', 'notifications._id': req.params.notificationId },
        { $set: { 'notifications.$.isRead': true } },
        { new: true },
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'Notification not found.' });
      }

      const notification = user.notifications.find((item) => String(item._id) === req.params.notificationId);
      return res.json({ success: true, notification });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/owner/contact-requests', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can review contact requests.' });
      }

      const properties = await AccommodationModel.find({
        ownerId: user._id,
        'contactRequests.0': { $exists: true },
      }).sort({ createdAt: -1 }).lean();
      const contactRequests = properties.flatMap((property) => (
        (property.contactRequests || []).map((contactRequest) => ({
          _id: contactRequest._id,
          status: contactRequest.status,
          requesterName: contactRequest.requesterName,
          requesterEmail: contactRequest.requesterEmail,
          createdAt: contactRequest.createdAt,
          updatedAt: contactRequest.updatedAt,
          property: {
            _id: property._id,
            title: property.title,
            city: property.city,
            location: property.location,
          },
        }))
      ));

      return res.json({ success: true, contactRequests });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/owner/contact-requests/:requestId', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.requestId)) {
        return res.status(404).json({ success: false, message: 'Contact request not found.' });
      }
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can review contact requests.' });
      }

      const { status } = req.body;
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Choose accept or reject for this request.' });
      }

      const property = await AccommodationModel.findOneAndUpdate(
        {
          ownerId: user._id,
          contactRequests: {
            $elemMatch: { _id: req.params.requestId, status: 'pending' },
          },
        },
        {
          $set: {
            'contactRequests.$.status': status,
            'contactRequests.$.updatedAt': new Date(),
          },
        },
        { new: true, runValidators: true },
      );
      if (!property) {
        return res.status(404).json({ success: false, message: 'Pending contact request not found.' });
      }

      const contactRequest = property.contactRequests.find((item) => String(item._id) === req.params.requestId);
      await saveNotification(contactRequest.userId, user, {
        type: 'contact-request-decision',
        title: `Your contact request was ${status}`,
        message: `${property.title}: the owner ${status} your request.`,
        propertyId: property._id,
        propertyTitle: property.title,
        contactRequestId: contactRequest._id,
      }, 'tenant');

      return res.json({
        success: true,
        contactRequest: {
          _id: contactRequest._id,
          status: contactRequest.status,
          requesterName: contactRequest.requesterName,
          requesterEmail: contactRequest.requesterEmail,
          property: { _id: property._id, title: property.title },
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/properties', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can create listings.' });
      }

      const property = await AccommodationModel.create({
        title: req.body.title,
        description: req.body.description || '',
        accommodation_type: req.body.accommodation_type,
        city: req.body.city,
        location: req.body.location,
        address: req.body.address || '',
        monthly_rent: req.body.monthly_rent,
        number_of_rooms: req.body.number_of_rooms,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        facilities: req.body.facilities || [],
        images: req.body.images || [],
        status: req.body.status || 'Available',
        gender: req.body.gender,
        email: user.email,
        rating: 0,
        ownerId: user._id,
      });

      return res.status(201).json({ success: true, property });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/properties/mine', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can view listings.' });
      }

      const properties = await AccommodationModel.find({ ownerId: user._id }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, properties });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/properties/:propertyId', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const property = await AccommodationModel.findById(req.params.propertyId)
        .populate('ownerId', 'fullName isVerified')
        .lean();
      if (!property || property.status !== 'Available') {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      return res.json({
        success: true,
        property: {
          _id: property._id,
          title: property.title,
          description: property.description,
          accommodation_type: property.accommodation_type,
          city: property.city,
          location: property.location,
          address: property.address,
          monthly_rent: property.monthly_rent,
          number_of_rooms: property.number_of_rooms,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          facilities: property.facilities,
          images: property.images,
          gender: property.gender,
          rating: property.rating,
          createdAt: property.createdAt,
          owner: {
            fullName: property.ownerId?.fullName || 'Property owner',
            isVerified: property.ownerId?.isVerified === true,
          },
          comments: (property.comments || []).map((comment) => ({
            _id: comment._id,
            author: comment.author,
            text: comment.text,
            createdAt: comment.createdAt,
            replies: (comment.replies || []).map((reply) => ({
              _id: reply._id,
              author: reply.author,
              text: reply.text,
              createdAt: reply.createdAt,
            })),
          })),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/properties/:propertyId/comments', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
      if (!text || text.length > 1000) {
        return res.status(400).json({ success: false, message: 'Comments must be between 1 and 1000 characters.' });
      }

      const property = await AccommodationModel.findOneAndUpdate(
        { _id: req.params.propertyId, status: 'Available' },
        {
          $push: {
            comments: {
              $each: [{ userId: req.userId, author: user.fullName, text }],
              $slice: -200,
            },
          },
        },
        { new: true, runValidators: true },
      );
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const comment = property.comments[property.comments.length - 1];
      await notifyPropertyOwner(property, user, {
        type: 'comment',
        title: `${user.fullName} commented on your listing`,
        message: `${property.title}: ${text.slice(0, 180)}`,
        propertyId: property._id,
        propertyTitle: property.title,
        commentId: comment._id,
      });
      return res.status(201).json({
        success: true,
        comment: {
          _id: comment._id,
          author: comment.author,
          text: comment.text,
          createdAt: comment.createdAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/properties/:propertyId/comments/:commentId/replies', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId) || !mongoose.isValidObjectId(req.params.commentId)) {
        return res.status(404).json({ success: false, message: 'Comment not found.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
      if (!text || text.length > 1000) {
        return res.status(400).json({ success: false, message: 'Replies must be between 1 and 1000 characters.' });
      }

      const property = await AccommodationModel.findOneAndUpdate(
        {
          _id: req.params.propertyId,
          status: 'Available',
          'comments._id': req.params.commentId,
        },
        {
          $push: {
            'comments.$.replies': {
              $each: [{ userId: req.userId, author: user.fullName, text }],
              $slice: -100,
            },
          },
        },
        { new: true, runValidators: true },
      );
      if (!property) {
        return res.status(404).json({ success: false, message: 'Comment not found.' });
      }

      const comment = property.comments.find((item) => String(item._id) === req.params.commentId);
      const reply = comment.replies[comment.replies.length - 1];
      const notificationRecipients = new Map([
        [String(comment.userId), 'comment-author'],
        [String(property.ownerId), 'listing-owner'],
      ]);
      for (const [recipientId, recipientType] of notificationRecipients) {
        const isCommentAuthor = recipientType === 'comment-author';
        await saveNotification(recipientId, user, {
          type: 'reply',
          title: isCommentAuthor
            ? `${user.fullName} replied to your comment`
            : `${user.fullName} replied to a comment on your listing`,
          message: `${property.title}: ${text.slice(0, 180)}`,
          propertyId: property._id,
          propertyTitle: property.title,
          commentId: comment._id,
          replyId: reply._id,
        }, isCommentAuthor ? undefined : 'owner');
      }
      return res.status(201).json({
        success: true,
        reply: {
          _id: reply._id,
          author: reply.author,
          text: reply.text,
          createdAt: reply.createdAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/properties/:propertyId/contact-requests', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'tenant') {
        return res.status(403).json({ success: false, message: 'Only tenants can request property contact.' });
      }

      const existingProperty = await AccommodationModel.findById(req.params.propertyId).lean();
      if (!existingProperty || existingProperty.status !== 'Available') {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      if (String(existingProperty.ownerId) === String(user._id)) {
        return res.status(403).json({ success: false, message: 'You cannot request contact for your own listing.' });
      }
      if ((existingProperty.contactRequests || []).some((item) => (
        String(item.userId) === String(user._id) && item.status === 'pending'
      ))) {
        return res.status(409).json({ success: false, message: 'You already have a pending request for this listing.' });
      }

      const property = await AccommodationModel.findOneAndUpdate(
        {
          _id: req.params.propertyId,
          status: 'Available',
          ownerId: { $ne: user._id },
          contactRequests: { $not: { $elemMatch: { userId: user._id, status: 'pending' } } },
        },
        {
          $push: {
            contactRequests: {
              $each: [{
                userId: user._id,
                requesterName: user.fullName,
                requesterEmail: user.email,
              }],
              $slice: -200,
            },
          },
        },
        { new: true, runValidators: true },
      );
      if (!property) {
        return res.status(409).json({ success: false, message: 'A pending request already exists or the listing changed.' });
      }

      const contactRequest = property.contactRequests[property.contactRequests.length - 1];
      await notifyPropertyOwner(property, user, {
        type: 'contact-request',
        title: `${user.fullName} requested to contact you`,
        message: `${property.title} · ${user.email}`,
        propertyId: property._id,
        propertyTitle: property.title,
        contactRequestId: contactRequest._id,
      });

      return res.status(201).json({
        success: true,
        contactRequest: {
          _id: contactRequest._id,
          status: contactRequest.status,
          propertyId: property._id,
          propertyTitle: property.title,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/properties/:propertyId/contact-requests/mine', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'tenant') {
        return res.status(403).json({ success: false, message: 'Only tenants can view their contact requests.' });
      }

      const property = await AccommodationModel.findById(req.params.propertyId).lean();
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      const contactRequest = [...(property.contactRequests || [])]
        .filter((item) => String(item.userId) === String(user._id))
        .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))[0];

      return res.json({
        success: true,
        contactRequest: contactRequest ? {
          _id: contactRequest._id,
          status: contactRequest.status,
          createdAt: contactRequest.createdAt,
          updatedAt: contactRequest.updatedAt,
          propertyId: property._id,
          propertyTitle: property.title,
        } : null,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/properties/:propertyId/contact-details', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'tenant') {
        return res.status(403).json({ success: false, message: 'Only tenants can view owner contact details.' });
      }

      const property = await AccommodationModel.findById(req.params.propertyId)
        .populate('ownerId', 'fullName email phone occupation')
        .lean();
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const acceptedRequest = (property.contactRequests || []).some((contactRequest) => (
        String(contactRequest.userId) === String(user._id) && contactRequest.status === 'accepted'
      ));
      if (!acceptedRequest) {
        return res.status(403).json({ success: false, message: 'The owner must accept your contact request first.' });
      }

      return res.json({
        success: true,
        owner: {
          fullName: property.ownerId?.fullName || 'Property owner',
          email: property.ownerId?.email || '',
          phone: property.ownerId?.phone || '',
          occupation: property.ownerId?.occupation || '',
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/properties', async (req, res, next) => {
    try {
      const properties = await AccommodationModel.find({ status: 'Available' })
        .sort({ createdAt: -1 })
        .populate('ownerId', 'isVerified')
        .lean();

      const publicProperties = properties.map((property) => ({
        _id: property._id,
        title: property.title,
        description: property.description,
        accommodation_type: property.accommodation_type,
        city: property.city,
        location: property.location,
        address: property.address,
        monthly_rent: property.monthly_rent,
        number_of_rooms: property.number_of_rooms,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        images: property.images,
        gender: property.gender,
        rating: property.rating,
        createdAt: property.createdAt,
        isVerified: property.ownerId?.isVerified === true,
      }));

      return res.json({ success: true, properties: publicProperties });
    } catch (error) {
      return next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found.' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, message: 'Request body must contain valid JSON.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('API request failed:', error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'The server could not complete the request.',
    });
  });

  return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
