const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Accommodation = require('./models/Accommodation');
const OwnerVerification = require('./models/OwnerVerification');
const PropertyImage = require('./models/PropertyImage');
const PropertyReport = require('./models/PropertyReport');
const User = require('./models/User');
const { createAuthenticate } = require('./middleware/authenticate');
const { createImageUploadMiddleware } = require('./middleware/imageUpload');
const { getVerifiedFirebaseUser } = require('./utils/firebaseAuth');
const { getVerifiedGoogleUser } = require('./utils/googleAuth');
const { isValidImage } = require('./utils/imageValidation');
const { signAuthToken, verifyAuthToken } = require('./utils/authToken');
const { serializeUser } = require('./utils/serializeUser');

const MAX_PROPERTY_PHOTO_TOTAL_SIZE = 12 * 1024 * 1024;
const isPropertyPhotoUploadWithinLimit = (files) => (
  files.reduce((total, file) => total + file.size, 0) <= MAX_PROPERTY_PHOTO_TOTAL_SIZE
);

function getPropertyImageUrls(property) {
  return (property.images || []).flatMap((image) => {
    if (typeof image === 'string') return [image];
    if (image?._id) return [`/api/property-images/${property._id}/${image._id}`];
    return [];
  });
}

function getImageBuffer(imageData) {
  if (Buffer.isBuffer(imageData)) return imageData;
  if (imageData && typeof imageData.value === 'function') {
    return imageData.value(true);
  }
  return null;
}

function createApp({
  UserModel = User,
  AccommodationModel = Accommodation,
  OwnerVerificationModel = OwnerVerification,
  PropertyImageModel = PropertyImage,
  PropertyReportModel = PropertyReport,
  firebaseUserLookup = getVerifiedFirebaseUser,
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
  const parseVerificationUpload = createImageUploadMiddleware({
    maxFileSize: 4 * 1024 * 1024,
    maxFiles: 2,
    maxFields: 2,
    maxFieldSize: 1024,
    fileFields: [{ name: 'frontImage', maxCount: 1 }, { name: 'backImage', maxCount: 1 }],
    fileSizeErrorMessage: 'Each NID image must be 4 MB or smaller.',
    uploadErrorMessage: 'Upload one front image and one back image.',
    invalidTypeMessage: 'Upload the NID images as JPEG, PNG, or WebP files.',
  });
  const verificationUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification submissions. Please try again later.',
      });
    },
  });
  const parsePropertyImageUpload = createImageUploadMiddleware({
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 6,
    maxFields: 1,
    maxFieldSize: 20 * 1024,
    fieldName: 'images',
    fileSizeErrorMessage: 'Each property photo must be 5 MB or smaller, with up to 6 photos.',
    uploadErrorMessage: 'Upload up to 6 property photos.',
    invalidTypeMessage: 'Upload property photos as JPEG, PNG, or WebP files.',
  });
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

  app.post('/api/auth/firebase/register', authLimiter, async (req, res, next) => {
    try {
      const { idToken, role } = req.body;
      if (!['tenant', 'owner'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be tenant or owner.',
        });
      }

      const firebaseUser = await firebaseUserLookup(idToken);
      if (!firebaseUser.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Verify your email address before completing registration.',
        });
      }

      const fullName = typeof req.body.fullName === 'string' && req.body.fullName.trim()
        ? req.body.fullName.trim()
        : firebaseUser.fullName;
      if (fullName.length > 255) {
        return res.status(400).json({ success: false, message: 'Name must be 255 characters or fewer.' });
      }

      const existingFirebaseUser = await UserModel.findOne({ firebaseUid: firebaseUser.uid });
      if (existingFirebaseUser) {
        if (existingFirebaseUser.authProvider !== 'firebase'
          || existingFirebaseUser.role !== role
          || existingFirebaseUser.accountStatus !== 'active') {
          return res.status(409).json({ success: false, message: 'This Firebase account is already registered.' });
        }
        return res.json({
          success: true,
          message: 'Account found.',
          user: serializeUser(existingFirebaseUser),
          token: tokenSigner(String(existingFirebaseUser._id), jwtSecret),
        });
      }

      const existingEmailUser = await UserModel.findOne({ email: firebaseUser.email });
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered. Sign in with your existing method.',
        });
      }

      const user = await UserModel.create({
        firebaseUid: firebaseUser.uid,
        fullName,
        email: firebaseUser.email,
        role,
        isVerified: firebaseUser.emailVerified,
        authProvider: 'firebase',
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

  app.post('/api/auth/firebase/login', authLimiter, async (req, res, next) => {
    try {
      const firebaseUser = await firebaseUserLookup(req.body.idToken);
      if (!firebaseUser.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Verify your email address before signing in.',
        });
      }

      const user = await UserModel.findOne({ firebaseUid: firebaseUser.uid });

      if (!user) {
        const existingEmailUser = await UserModel.findOne({ email: firebaseUser.email });
        return res.status(existingEmailUser ? 409 : 404).json({
          success: false,
          message: existingEmailUser
            ? 'This account uses a different sign-in method.'
            : 'Account not found. Register first.',
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

  app.get('/api/owner/verification', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can request verification.' });
      }

      const verification = await OwnerVerificationModel.findOne({ ownerId: user._id });
      return res.json({
        success: true,
        verification: verification ? {
          status: verification.status,
          rejectionReason: verification.status === 'rejected' ? verification.rejectionReason : '',
          submittedAt: verification.submittedAt || verification.createdAt,
        } : { status: 'unverified', rejectionReason: '', submittedAt: null },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/owner/verification', authenticate, verificationUploadLimiter, parseVerificationUpload, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can request verification.' });
      }

      const existing = await OwnerVerificationModel.findOne({ ownerId: user._id });
      if (existing?.status === 'pending' || user.ownerVerificationStatus === 'approved') {
        return res.status(409).json({
          success: false,
          message: existing?.status === 'pending'
            ? 'Your verification request is already being reviewed.'
            : 'Your owner account is already verified.',
        });
      }

      const nidName = typeof req.body.nidName === 'string' ? req.body.nidName.trim() : '';
      const nidNumber = typeof req.body.nidNumber === 'string'
        ? req.body.nidNumber.replace(/[\s-]/g, '')
        : '';
      const frontImage = req.files?.frontImage?.[0];
      const backImage = req.files?.backImage?.[0];
      if (!nidName || nidName.length > 255) {
        return res.status(400).json({ success: false, message: 'Enter the name printed on your NID (up to 255 characters).' });
      }
      if (!/^(?:\d{10}|\d{13}|\d{17})$/.test(nidNumber)) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10, 13, or 17 digit NID number.' });
      }
      if (!frontImage || !backImage) {
        return res.status(400).json({ success: false, message: 'Upload both the front and back of your NID.' });
      }
      if (!isValidImage(frontImage) || !isValidImage(backImage)) {
        return res.status(400).json({ success: false, message: 'The uploaded files must be valid JPEG, PNG, or WebP images.' });
      }

      const verification = await OwnerVerificationModel.findOneAndUpdate(
        { ownerId: user._id },
        {
          $set: {
            nidName,
            nidNumber,
            frontImage: frontImage.buffer,
            frontMimeType: frontImage.mimetype,
            backImage: backImage.buffer,
            backMimeType: backImage.mimetype,
            status: 'pending',
            rejectionReason: '',
            submittedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
          },
          $setOnInsert: { ownerId: user._id },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      await UserModel.findOneAndUpdate(
        { _id: user._id, accountStatus: 'active' },
        { $set: { isVerified: false, ownerVerificationStatus: 'pending' } },
        { new: true, runValidators: true },
      );

      return res.status(201).json({
        success: true,
        message: 'Your NID has been submitted for review.',
        verification: { status: verification.status, submittedAt: verification.submittedAt },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'A verification request already exists. Refresh your status and try again.',
        });
      }
      return next(error);
    }
  });

  app.get('/api/admin/owner-verifications', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can review owner verifications.' });
      }

      const status = req.query.status || 'pending';
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Choose a valid verification status.' });
      }
      const verifications = await OwnerVerificationModel.find({ status })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('ownerId', 'fullName email')
        .lean();
      return res.json({
        success: true,
        verifications: verifications.map((verification) => ({
          id: String(verification._id),
          owner: {
            id: String(verification.ownerId?._id || verification.ownerId),
            fullName: verification.ownerId?.fullName || '',
            email: verification.ownerId?.email || '',
          },
          nidName: verification.nidName,
          nidNumber: verification.nidNumber,
          status: verification.status,
          submittedAt: verification.submittedAt || verification.createdAt,
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/owner-verifications/:verificationId/documents/:side', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can view NID documents.' });
      }
      if (!mongoose.isValidObjectId(req.params.verificationId) || !['front', 'back'].includes(req.params.side)) {
        return res.status(404).json({ success: false, message: 'NID document not found.' });
      }

      const verification = await OwnerVerificationModel.findById(req.params.verificationId);
      const image = verification?.[`${req.params.side}Image`];
      const mimeType = verification?.[`${req.params.side}MimeType`];
      if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        return res.status(404).json({ success: false, message: 'NID document not found.' });
      }

      res.set({
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.type(mimeType).send(image);
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/admin/owner-verifications/:verificationId', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can review owner verifications.' });
      }
      if (!mongoose.isValidObjectId(req.params.verificationId)) {
        return res.status(404).json({ success: false, message: 'Verification request not found.' });
      }
      if (!['approve', 'reject'].includes(req.body.decision)) {
        return res.status(400).json({ success: false, message: 'Choose approve or reject.' });
      }
      const rejectionReason = typeof req.body.rejectionReason === 'string'
        ? req.body.rejectionReason.trim()
        : '';
      if (req.body.decision === 'reject' && (!rejectionReason || rejectionReason.length > 500)) {
        return res.status(400).json({ success: false, message: 'Provide a rejection reason of up to 500 characters.' });
      }

      const status = req.body.decision === 'approve' ? 'approved' : 'rejected';
      const verification = await OwnerVerificationModel.findOneAndUpdate(
        { _id: req.params.verificationId, status: 'pending' },
        {
          $set: {
            status,
            rejectionReason: status === 'rejected' ? rejectionReason : '',
            reviewedAt: new Date(),
            reviewedBy: admin._id,
          },
        },
        { new: true, runValidators: true },
      );
      if (!verification) {
        return res.status(404).json({ success: false, message: 'Pending verification request not found.' });
      }

      await UserModel.findOneAndUpdate(
        { _id: verification.ownerId },
        { $set: { isVerified: status === 'approved', ownerVerificationStatus: status } },
        { new: true, runValidators: true },
      );
      return res.json({ success: true, message: `Owner verification ${status}.`, status });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/properties/:propertyId/reports', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      const property = await AccommodationModel.findById(req.params.propertyId).lean();
      if (!property || property.status !== 'Available') {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      if (String(property.ownerId?._id || property.ownerId) === String(user._id)) {
        return res.status(403).json({ success: false, message: 'You cannot report your own listing.' });
      }

      const categories = new Set([
        'scam',
        'sexual-content',
        'violence',
        'discrimination',
        'misleading-information',
        'unsafe-property',
        'duplicate-listing',
        'other',
      ]);
      if (!categories.has(req.body.category)) {
        return res.status(400).json({ success: false, message: 'Choose a valid reason for this report.' });
      }
      if (req.body.details !== undefined && typeof req.body.details !== 'string') {
        return res.status(400).json({ success: false, message: 'Report details must be text.' });
      }

      const details = (req.body.details || '').trim();
      if (details.length > 1000) {
        return res.status(400).json({ success: false, message: 'Report details must be 1000 characters or fewer.' });
      }

      const report = await PropertyReportModel.create({
        propertyId: property._id,
        propertyTitle: property.title,
        reporterId: user._id,
        category: req.body.category,
        details,
      });

      return res.status(201).json({
        success: true,
        message: 'Thank you. Your report has been sent for review.',
        report: {
          id: report._id,
          propertyId: report.propertyId,
          category: report.category,
          status: report.status || 'pending',
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/reports', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can review property reports.' });
      }

      const reports = await PropertyReportModel.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      return res.json({
        success: true,
        reports: reports.map((report) => ({
          id: String(report._id),
          propertyId: String(report.propertyId),
          propertyTitle: report.propertyTitle,
          reporterId: String(report.reporterId),
          category: report.category,
          details: report.details || '',
          status: report.status || 'pending',
          createdAt: report.createdAt,
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/summary', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can view the admin dashboard.' });
      }

      const [users, posts, pendingReports, pendingVerifications] = await Promise.all([
        UserModel.countDocuments({ role: { $in: ['tenant', 'owner'] } }),
        AccommodationModel.countDocuments({}),
        PropertyReportModel.countDocuments({ status: 'pending' }),
        OwnerVerificationModel.countDocuments({ status: 'pending' }),
      ]);
      return res.json({
        success: true,
        summary: { users, posts, pendingReports, pendingVerifications },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/users', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can manage users.' });
      }

      const users = await UserModel.find({})
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return res.json({
        success: true,
        users: users.map((user) => ({
          id: String(user._id),
          fullName: user.fullName,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          accountStatus: user.accountStatus,
          isVerified: user.role === 'owner'
            ? user.ownerVerificationStatus === 'approved'
            : user.isVerified === true,
          createdAt: user.createdAt,
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/admin/users/:userId/status', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can manage users.' });
      }
      if (!mongoose.isValidObjectId(req.params.userId)) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      if (!['active', 'suspended'].includes(req.body.accountStatus)) {
        return res.status(400).json({ success: false, message: 'Account status must be active or suspended.' });
      }
      if (String(admin._id) === req.params.userId) {
        return res.status(400).json({ success: false, message: 'You cannot change your own account status.' });
      }

      const user = await UserModel.findOneAndUpdate(
        { _id: req.params.userId, role: { $ne: 'admin' } },
        { $set: { accountStatus: req.body.accountStatus } },
        { new: true, runValidators: true },
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found or cannot be managed.' });
      }
      return res.json({
        success: true,
        user: { id: String(user._id), accountStatus: user.accountStatus },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/posts', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can manage posts.' });
      }

      const posts = await AccommodationModel.find({})
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('ownerId', 'fullName email')
        .lean();
      return res.json({
        success: true,
        posts: posts.map((post) => ({
          id: String(post._id),
          title: post.title,
          city: post.city,
          location: post.location,
          monthlyRent: post.monthly_rent,
          status: post.status,
          createdAt: post.createdAt,
          owner: {
            id: String(post.ownerId?._id || post.ownerId || ''),
            fullName: post.ownerId?.fullName || '',
            email: post.ownerId?.email || '',
          },
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/admin/posts/:postId', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can remove posts.' });
      }
      if (!mongoose.isValidObjectId(req.params.postId)) {
        return res.status(404).json({ success: false, message: 'Post not found.' });
      }

      const post = await AccommodationModel.findByIdAndDelete(req.params.postId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found.' });
      }
      await PropertyImageModel.deleteMany({ propertyId: post._id });
      return res.json({ success: true, message: 'Post removed.' });
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/admin/reports/:reportId', authenticate, async (req, res, next) => {
    try {
      const admin = await UserModel.findById(req.userId);
      if (!admin || admin.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can review property reports.' });
      }
      if (!mongoose.isValidObjectId(req.params.reportId)) {
        return res.status(404).json({ success: false, message: 'Report not found.' });
      }
      if (!['reviewed', 'dismissed'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Choose reviewed or dismissed.' });
      }

      const report = await PropertyReportModel.findOneAndUpdate(
        { _id: req.params.reportId, status: 'pending' },
        { $set: { status: req.body.status } },
        { new: true, runValidators: true },
      );
      if (!report) {
        return res.status(404).json({ success: false, message: 'Pending report not found.' });
      }
      return res.json({ success: true, status: report.status });
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

  app.get('/api/users/me/watchlist', authenticate, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      const properties = await AccommodationModel.find({
        _id: { $in: user.watchlist || [] },
        status: 'Available',
      })
        .sort({ createdAt: -1 })
        .populate('ownerId', 'ownerVerificationStatus')
        .lean();

      return res.json({
        success: true,
        properties: properties.map((property) => ({
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
          images: getPropertyImageUrls(property),
          gender: property.gender,
          rating: property.rating,
          createdAt: property.createdAt,
          isVerified: property.ownerId?.ownerVerificationStatus === 'approved',
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/users/me/watchlist/:propertyId', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      if (typeof req.body.watched !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Choose whether to save or remove this property.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      const property = await AccommodationModel.findById(req.params.propertyId).lean();
      if (!property || property.status !== 'Available') {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const update = req.body.watched
        ? { $addToSet: { watchlist: property._id } }
        : { $pull: { watchlist: property._id } };
      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: req.userId, accountStatus: 'active' },
        update,
        { new: true, runValidators: true },
      );
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }

      return res.json({ success: true, watched: req.body.watched });
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

  app.post('/api/properties', authenticate, parsePropertyImageUpload, async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can create listings.' });
      }

      let propertyData = req.body;
      if (req.is('multipart/form-data')) {
        try {
          propertyData = JSON.parse(req.body.property || '{}');
        } catch {
          return res.status(400).json({ success: false, message: 'Property details must contain valid JSON.' });
        }
      }
      const uploadedImages = req.files || [];
      if (uploadedImages.some((file) => !isValidImage(file))) {
        return res.status(400).json({ success: false, message: 'The uploaded files must be valid JPEG, PNG, or WebP images.' });
      }
      if (!isPropertyPhotoUploadWithinLimit(uploadedImages)) {
        return res.status(413).json({
          success: false,
          message: 'Property photos must total 12 MB or less per listing.',
        });
      }
      if (propertyData.images !== undefined && !Array.isArray(propertyData.images)) {
        return res.status(400).json({ success: false, message: 'Property image URLs must be a list.' });
      }
      if ((propertyData.images || []).some((image) => typeof image !== 'string')) {
        return res.status(400).json({ success: false, message: 'Property images must be uploaded as image files.' });
      }
      if (propertyData.facilities !== undefined && !Array.isArray(propertyData.facilities)) {
        return res.status(400).json({ success: false, message: 'Property facilities must be a list.' });
      }

      const property = await AccommodationModel.create({
        title: propertyData.title,
        description: propertyData.description || '',
        accommodation_type: propertyData.accommodation_type,
        city: propertyData.city,
        location: propertyData.location,
        address: propertyData.address || '',
        monthly_rent: propertyData.monthly_rent,
        number_of_rooms: propertyData.number_of_rooms,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        facilities: propertyData.facilities || [],
        images: [
          ...(propertyData.images || []),
          ...uploadedImages.map((file) => ({
            _id: new mongoose.Types.ObjectId(),
            data: mongoose.mongo.BSON.Binary.createFromBase64(file.buffer.toString('base64')),
            mimeType: file.mimetype,
          })),
        ],
        status: propertyData.status || 'Available',
        gender: propertyData.gender,
        email: user.email,
        rating: 0,
        ownerId: user._id,
      });

      return res.status(201).json({
        success: true,
        property: { ...property.toObject(), images: getPropertyImageUrls(property) },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/properties/:propertyId', authenticate, parsePropertyImageUpload, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can update listings.' });
      }

      let propertyData = req.body;
      if (req.is('multipart/form-data')) {
        try {
          propertyData = JSON.parse(req.body.property || '{}');
        } catch {
          return res.status(400).json({ success: false, message: 'Property details must contain valid JSON.' });
        }
      }
      if (!propertyData || typeof propertyData !== 'object' || Array.isArray(propertyData)) {
        return res.status(400).json({ success: false, message: 'Property details must be an object.' });
      }
      if (!Array.isArray(propertyData.images) || propertyData.images.some((image) => typeof image !== 'string')) {
        return res.status(400).json({ success: false, message: 'Property images must be a list of existing image URLs.' });
      }
      if (propertyData.facilities !== undefined && !Array.isArray(propertyData.facilities)) {
        return res.status(400).json({ success: false, message: 'Property facilities must be a list.' });
      }

      const existingProperty = await AccommodationModel.findById(req.params.propertyId);
      if (!existingProperty || String(existingProperty.ownerId) !== String(user._id)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const existingImages = existingProperty.images || [];
      const retainedImages = [];
      for (const requestedImage of propertyData.images) {
        let requestedPath;
        try {
          requestedPath = new URL(requestedImage, 'http://localhost').pathname;
        } catch {
          return res.status(400).json({ success: false, message: 'Choose only existing photos from this property.' });
        }
        const retainedImage = existingImages.find((image) => {
          if (typeof image === 'string') return image === requestedImage;
          if (!image?._id) return false;
          return requestedPath === `/api/property-images/${existingProperty._id}/${image._id}`;
        });
        if (!retainedImage || retainedImages.includes(retainedImage)) {
          return res.status(400).json({ success: false, message: 'Choose only existing photos from this property.' });
        }
        retainedImages.push(retainedImage);
      }

      const uploadedImages = req.files || [];
      if (uploadedImages.some((file) => !isValidImage(file))) {
        return res.status(400).json({ success: false, message: 'The uploaded files must be valid JPEG, PNG, or WebP images.' });
      }
      if (retainedImages.length + uploadedImages.length > 6) {
        return res.status(400).json({ success: false, message: 'Upload up to 6 property photos.' });
      }
      const retainedImageSizes = retainedImages.flatMap((image) => {
        const buffer = typeof image === 'object' ? getImageBuffer(image.data) : null;
        return buffer ? [{ size: buffer.length }] : [];
      });
      if (!isPropertyPhotoUploadWithinLimit([...retainedImageSizes, ...uploadedImages])) {
        return res.status(413).json({
          success: false,
          message: 'Property photos must total 12 MB or less per listing.',
        });
      }

      const property = await AccommodationModel.findOneAndUpdate(
        { _id: req.params.propertyId, ownerId: user._id },
        {
          $set: {
            title: propertyData.title,
            description: propertyData.description || '',
            accommodation_type: propertyData.accommodation_type,
            city: propertyData.city,
            location: propertyData.location,
            address: propertyData.address || '',
            monthly_rent: propertyData.monthly_rent,
            number_of_rooms: propertyData.number_of_rooms,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            facilities: propertyData.facilities || [],
            images: [
              ...retainedImages,
              ...uploadedImages.map((file) => ({
                _id: new mongoose.Types.ObjectId(),
                data: mongoose.mongo.BSON.Binary.createFromBase64(file.buffer.toString('base64')),
                mimeType: file.mimetype,
              })),
            ],
            status: propertyData.status,
            gender: propertyData.gender,
          },
        },
        { new: true, runValidators: true },
      );
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const propertyObject = typeof property.toObject === 'function' ? property.toObject() : property;
      return res.json({
        success: true,
        property: { ...propertyObject, images: getPropertyImageUrls(property) },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/properties/:propertyId', authenticate, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.propertyId)) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }

      const user = await UserModel.findById(req.userId);
      if (!user || user.accountStatus !== 'active') {
        return res.status(404).json({ success: false, message: 'User not found or inactive.' });
      }
      if (user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only property owners can delete listings.' });
      }

      const property = await AccommodationModel.findOneAndDelete({
        _id: req.params.propertyId,
        ownerId: user._id,
      });
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      await PropertyImageModel.deleteMany({ propertyId: property._id });
      return res.json({ success: true, message: 'Property deleted.' });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/property-images/:propertyId/:photoId', async (req, res, next) => {
    try {
      if (
        !mongoose.isValidObjectId(req.params.propertyId)
        || !mongoose.isValidObjectId(req.params.photoId)
      ) {
        return res.status(404).json({ success: false, message: 'Property image not found.' });
      }

      const property = await AccommodationModel.findById(req.params.propertyId);
      const image = property?.images?.find((item) => (
        item && typeof item === 'object' && String(item._id) === req.params.photoId
      ));
      const imageBuffer = image ? getImageBuffer(image.data) : null;
      if (
        !imageBuffer
        || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)
      ) {
        return res.status(404).json({ success: false, message: 'Property image not found.' });
      }
      res.set({
        'Cache-Control': 'public, max-age=86400',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.type(image.mimeType).send(imageBuffer);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/property-images/:imageId', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.imageId)) {
        return res.status(404).json({ success: false, message: 'Property image not found.' });
      }

      const image = await PropertyImageModel.findById(req.params.imageId);
      if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
        return res.status(404).json({ success: false, message: 'Property image not found.' });
      }
      const property = await AccommodationModel.findById(image.propertyId).lean();
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property image not found.' });
      }
      res.set({
        'Cache-Control': 'public, max-age=86400',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.type(image.mimeType).send(image.data);
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
      return res.json({
        success: true,
        properties: properties.map((property) => ({
          ...property,
          images: getPropertyImageUrls(property),
        })),
      });
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
        .populate('ownerId', 'fullName ownerVerificationStatus')
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
          images: getPropertyImageUrls(property),
          gender: property.gender,
          rating: property.rating,
          createdAt: property.createdAt,
          owner: {
            fullName: property.ownerId?.fullName || 'Property owner',
            isVerified: property.ownerId?.ownerVerificationStatus === 'approved',
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
        .populate('ownerId', 'ownerVerificationStatus')
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
        images: getPropertyImageUrls(property),
        gender: property.gender,
        rating: property.rating,
        createdAt: property.createdAt,
        isVerified: property.ownerId?.ownerVerificationStatus === 'approved',
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
module.exports.isPropertyPhotoUploadWithinLimit = isPropertyPhotoUploadWithinLimit;
