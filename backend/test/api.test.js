const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const request = require('supertest');
const appModule = require('../src/app');
const Accommodation = require('../src/models/Accommodation');

const app = appModule.createApp;
const users = new Map();
const properties = [];
const reports = [];
const verifications = [];
const propertyImages = [];

const UserModel = {
  async findOne(query) {
    return [...users.values()].find((user) => (
      Object.entries(query).every(([field, value]) => user[field] === value)
    )) || null;
  },
  async findById(id) {
    return users.get(String(id)) || null;
  },
  find() {
    return {
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      async lean() {
        return [...users.values()];
      },
    };
  },
  async countDocuments(query) {
    if (query?.role?.$in) {
      return [...users.values()].filter((user) => query.role.$in.includes(user.role)).length;
    }
    return users.size;
  },
  async create(fields) {
    const user = { _id: 'new-user', accountStatus: 'active', ...fields };
    users.set(String(user._id), user);
    return user;
  },
  async findOneAndUpdate(query, update) {
    const user = users.get(String(query._id));
    if (!user || (query.accountStatus && user.accountStatus !== query.accountStatus)) return null;
    if (query.role?.$ne && user.role === query.role.$ne) return null;
    if (query['notifications._id']) {
      const notification = (user.notifications || []).find((item) => (
        String(item._id) === String(query['notifications._id'])
      ));
      if (!notification) return null;
      notification.isRead = update.$set['notifications.$.isRead'];
    } else if (update.$push?.notifications) {
      user.notifications = user.notifications || [];
      user.notifications.push(...update.$push.notifications.$each.map((item, index) => ({
        _id: String(user.notifications.length + index + 1).padStart(24, '0'),
        isRead: false,
        ...item,
      })));
    } else if (update.$addToSet?.watchlist) {
      user.watchlist = user.watchlist || [];
      if (!user.watchlist.some((item) => String(item) === String(update.$addToSet.watchlist))) {
        user.watchlist.push(update.$addToSet.watchlist);
      }
    } else if (update.$pull?.watchlist) {
      user.watchlist = (user.watchlist || []).filter((item) => (
        String(item) !== String(update.$pull.watchlist)
      ));
    } else {
      Object.assign(user, update.$set);
    }
    return user;
  },
};

function createTestApp() {
  users.clear();
  properties.length = 0;
  reports.length = 0;
  verifications.length = 0;
  propertyImages.length = 0;
  users.set('existing-user', {
    _id: 'existing-user',
    fullName: 'Existing User',
    email: 'existing@example.com',
    profileImage: null,
    phone: null,
    address: null,
    occupation: null,
    role: 'admin',
    authProvider: 'google',
    accountStatus: 'active',
  });
  users.set('owner-user', {
    _id: 'owner-user',
    fullName: 'Property Owner',
    email: 'owner@example.com',
    phone: '+8801712345678',
    occupation: 'Architect',
    role: 'owner',
    accountStatus: 'active',
    isVerified: true,
    ownerVerificationStatus: 'approved',
    notifications: [],
  });
  users.set('tenant-user', {
    _id: 'tenant-user',
    fullName: 'Helpful Tenant',
    email: 'tenant@example.com',
    role: 'tenant',
    accountStatus: 'active',
    notifications: [],
  });
  users.set('650000000000000000000073', {
    _id: '650000000000000000000073',
    fullName: 'Managed Tenant',
    email: 'managed@example.com',
    role: 'tenant',
    accountStatus: 'active',
    createdAt: new Date(),
  });

  return app({
    UserModel,
    OwnerVerificationModel: {
      async countDocuments(query) {
        return verifications.filter((verification) => verification.status === query.status).length;
      },
      async findOne(query) {
        return verifications.find((verification) => (
          String(verification.ownerId) === String(query.ownerId)
        )) || null;
      },
      find(query) {
        const matching = verifications.filter((verification) => verification.status === query.status);
        return {
          sort() {
            return this;
          },
          limit() {
            return this;
          },
          populate() {
            return this;
          },
          async lean() {
            return matching.map((verification) => {
              const owner = users.get(String(verification.ownerId));
              return {
                ...verification,
                ownerId: owner ? { _id: owner._id, fullName: owner.fullName, email: owner.email } : verification.ownerId,
              };
            });
          },
        };
      },
      findById(id) {
        const verification = verifications.find((item) => String(item._id) === String(id));
        return Promise.resolve(verification || null);
      },
      async findOneAndUpdate(query, update, options) {
        let verification = verifications.find((item) => (
          query._id
            ? String(item._id) === String(query._id) && (!query.status || item.status === query.status)
            : String(item.ownerId) === String(query.ownerId)
        ));
        if (!verification && options?.upsert) {
          verification = {
            _id: '650000000000000000000071',
            createdAt: new Date(),
            ...update.$setOnInsert,
          };
          verifications.push(verification);
        }
        if (!verification) return null;
        Object.assign(verification, update.$set);
        return verification;
      },
    },
    PropertyImageModel: {
      async create(fields) {
        assert.ok(fields.data instanceof mongoose.mongo.BSON.Binary);
        const image = {
          _id: '650000000000000000000079',
          ...fields,
          data: Buffer.from(fields.data.value(true)),
        };
        propertyImages.push(image);
        return image;
      },
      async findById(id) {
        return propertyImages.find((image) => String(image._id) === String(id)) || null;
      },
      async deleteMany(query) {
        for (let index = propertyImages.length - 1; index >= 0; index -= 1) {
          const matchesId = query._id?.$in?.map(String).includes(String(propertyImages[index]._id));
          const matchesProperty = query.propertyId
            && String(query.propertyId) === String(propertyImages[index].propertyId);
          if (matchesId || matchesProperty) propertyImages.splice(index, 1);
        }
      },
    },
    PropertyReportModel: {
      async countDocuments(query) {
        return reports.filter((report) => report.status === query.status).length;
      },
      async create(fields) {
        const report = { _id: `report-${reports.length + 1}`, status: 'pending', ...fields };
        reports.push(report);
        return report;
      },
      find() {
        return {
          sort() {
            return this;
          },
          limit() {
            return this;
          },
          async lean() {
            return reports;
          },
        };
      },
      async findOneAndUpdate(query, update) {
        const report = reports.find((item) => (
          String(item._id) === String(query._id) && item.status === query.status
        ));
        if (!report) return null;
        Object.assign(report, update.$set);
        return report;
      },
    },
    AccommodationModel: {
      async countDocuments() {
        return properties.length;
      },
      async create(fields) {
        const property = { _id: '650000000000000000000078', ...fields };
        property.toObject = () => ({ ...property });
        properties.push(property);
        return property;
      },
      find(query) {
        const matchingProperties = properties.filter((property) => Object.entries(query).every(([field, value]) => {
          if (field === 'contactRequests.0') return property.contactRequests?.length > 0;
          if (field === '_id' && value?.$in) {
            return value.$in.some((id) => String(id) === String(property._id));
          }
          return String(property[field]) === String(value);
        }));
        return {
          sort() {
            return this;
          },
          limit() {
            return this;
          },
          populate() {
            return this;
          },
          async lean() {
            return matchingProperties.map((property) => {
              const owner = users.get(String(property.ownerId));
              return {
                ...property,
                ownerId: owner ? {
                  _id: owner._id,
                  fullName: owner.fullName,
                  email: owner.email,
                  ownerVerificationStatus: owner.ownerVerificationStatus,
                } : property.ownerId,
              };
            });
          },
        };
      },
      findById(id) {
        const property = properties.find((item) => String(item._id) === String(id));
        return {
          populate() {
            return this;
          },
          select() {
            return this;
          },
          then(resolve, reject) {
            return Promise.resolve(property || null).then(resolve, reject);
          },
          async lean() {
            if (!property) return null;
            const owner = users.get(String(property.ownerId));
            return {
              ...property,
              ownerId: owner ? {
                _id: owner._id,
                fullName: owner.fullName,
                ownerVerificationStatus: owner.ownerVerificationStatus,
                email: owner.email,
                phone: owner.phone,
                occupation: owner.occupation,
              } : property.ownerId,
            };
          },
        };
      },
      async findByIdAndDelete(id) {
        const index = properties.findIndex((item) => String(item._id) === String(id));
        if (index < 0) return null;
        return properties.splice(index, 1)[0];
      },
      async findOneAndDelete(query) {
        const index = properties.findIndex((item) => (
          String(item._id) === String(query._id) && String(item.ownerId) === String(query.ownerId)
        ));
        if (index < 0) return null;
        return properties.splice(index, 1)[0];
      },
      async findOneAndUpdate(query, update) {
        const property = properties.find((item) => Object.entries(query).every(([field, value]) => {
          if (field === '_id') return String(item._id) === String(value);
          if (field === 'ownerId') {
            return value?.$ne ? String(item.ownerId) !== String(value.$ne) : String(item.ownerId) === String(value);
          }
          if (field === 'comments._id') {
            return item.comments?.some((comment) => String(comment._id) === String(value));
          }
          if (field === 'contactRequests._id') {
            return item.contactRequests?.some((contactRequest) => String(contactRequest._id) === String(value));
          }
          if (field === 'contactRequests.status') {
            return item.contactRequests?.some((contactRequest) => contactRequest.status === value);
          }
          if (field === 'contactRequests') {
            if (value.$elemMatch) {
              return item.contactRequests?.some((contactRequest) => (
                String(contactRequest._id) === String(value.$elemMatch._id)
                && contactRequest.status === value.$elemMatch.status
              ));
            }
            const duplicate = item.contactRequests?.some((contactRequest) => (
              String(contactRequest.userId) === String(value.$not.$elemMatch.userId)
              && contactRequest.status === value.$not.$elemMatch.status
            ));
            return !duplicate;
          }
          return item[field] === value;
        }));
        if (!property) return null;
        if (update.$set && !Object.keys(update.$set).some((field) => field.startsWith('contactRequests.$.'))) {
          Object.assign(property, update.$set);
          return property;
        }
        if (update.$set?.images) {
          property.images = update.$set.images;
          const responseProperty = { ...property };
          delete responseProperty.photos;
          return responseProperty;
        }
        if (update.$push?.comments) {
          property.comments = property.comments || [];
          const [newComment] = update.$push.comments.$each;
          property.comments.push({ _id: '650000000000000000000003', createdAt: new Date(), ...newComment });
          return property;
        }

        if (update.$push?.contactRequests) {
          property.contactRequests = property.contactRequests || [];
          const [contactRequest] = update.$push.contactRequests.$each;
          property.contactRequests.push({
            _id: '650000000000000000000031',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...contactRequest,
          });
          return property;
        }

        if (update.$set?.['contactRequests.$.status']) {
          const requestId = query.contactRequests.$elemMatch._id;
          const contactRequest = property.contactRequests.find((item) => (
            String(item._id) === String(requestId)
          ));
          contactRequest.status = update.$set['contactRequests.$.status'];
          contactRequest.updatedAt = update.$set['contactRequests.$.updatedAt'];
          return property;
        }

        const parentComment = property.comments.find((comment) => String(comment._id) === String(query['comments._id']));
        if (!parentComment) return null;
        parentComment.replies = parentComment.replies || [];
        const [newReply] = update.$push['comments.$.replies'].$each;
        parentComment.replies.push({ _id: '650000000000000000000004', createdAt: new Date(), ...newReply });
        return property;
      },
    },
    googleUserLookup: async (accessToken) => {
      if (!['valid-google-token', 'existing-google-token'].includes(accessToken)) {
        const error = new Error('Google token is invalid.');
        error.status = 401;
        throw error;
      }
      return {
        email: accessToken === 'existing-google-token' ? 'existing@example.com' : 'new@example.com',
        fullName: accessToken === 'existing-google-token' ? 'Existing User' : 'New User',
        profileImage: accessToken === 'existing-google-token' ? null : 'https://example.com/new-user.png',
      };
    },
    firebaseUserLookup: async (idToken) => {
      if (!['valid-firebase-token', 'existing-firebase-token', 'unverified-firebase-token'].includes(idToken)) {
        const error = new Error('Firebase token is invalid.');
        error.status = 401;
        throw error;
      }
      const isExistingUser = idToken === 'existing-firebase-token';
      const isUnverifiedUser = idToken === 'unverified-firebase-token';
      return {
        uid: isExistingUser ? 'existing-firebase-uid' : isUnverifiedUser ? 'unverified-firebase-uid' : 'new-firebase-uid',
        email: isExistingUser ? 'existing@example.com' : isUnverifiedUser ? 'unverified@example.com' : 'new@example.com',
        fullName: isExistingUser ? 'Existing User' : 'New User',
        emailVerified: !isUnverifiedUser,
      };
    },
    tokenSigner: () => 'signed-test-token',
    tokenVerifier: (token) => {
      if (token === 'signed-test-token') return 'existing-user';
      if (token === 'owner-test-token') return 'owner-user';
      if (token === 'tenant-test-token') return 'tenant-user';
      if (token === 'managed-tenant-token') return '650000000000000000000073';
      throw new Error('Invalid token.');
    },
    jwtSecret: 'test-secret',
    googleClientId: 'test-google-client',
    clientOrigins: 'http://localhost:3000',
  });
}

let testApp;

beforeEach(() => {
  testApp = createTestApp();
});

afterEach(() => {
  users.clear();
});

test('registers a verified Google account as a tenant or owner', async () => {
  const response = await request(testApp)
    .post('/api/auth/google/register')
    .send({ accessToken: 'valid-google-token', role: 'owner' });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'new@example.com');
  assert.equal(response.body.user.role, 'owner');
  assert.equal(response.body.user.isVerified, false);
  assert.equal(response.body.token, 'signed-test-token');
});

test('registers a Firebase account and binds it to the selected role', async () => {
  const response = await request(testApp)
    .post('/api/auth/firebase/register')
    .send({ idToken: 'valid-firebase-token', role: 'owner', fullName: 'New Firebase User' });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'new@example.com');
  assert.equal(response.body.user.role, 'owner');
  assert.equal(response.body.user.authProvider, 'firebase');
  assert.equal(response.body.token, 'signed-test-token');
  assert.equal(users.get('new-user').firebaseUid, 'new-firebase-uid');
});

test('rejects Firebase registration until the email is verified', async () => {
  const response = await request(testApp)
    .post('/api/auth/firebase/register')
    .send({ idToken: 'unverified-firebase-token', role: 'tenant' });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /verify your email/i);
  assert.equal(users.has('new-user'), false);
});

test('rejects Firebase login until the email is verified', async () => {
  const response = await request(testApp)
    .post('/api/auth/firebase/login')
    .send({ idToken: 'unverified-firebase-token' });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /verify your email/i);
});

test('rejects Firebase registration using an email already owned by another provider', async () => {
  const response = await request(testApp)
    .post('/api/auth/firebase/register')
    .send({ idToken: 'existing-firebase-token', role: 'tenant' });

  assert.equal(response.status, 409);
  assert.equal(users.has('new-user'), false);
});

test('rejects invalid Firebase tokens without creating a profile', async () => {
  const response = await request(testApp)
    .post('/api/auth/firebase/register')
    .send({ idToken: 'invalid-token', role: 'tenant' });

  assert.equal(response.status, 401);
  assert.equal(users.has('new-user'), false);
});

test('logs in a Firebase account using its Firebase UID', async () => {
  users.set('firebase-user', {
    _id: 'firebase-user',
    firebaseUid: 'existing-firebase-uid',
    fullName: 'Existing User',
    email: 'existing@example.com',
    role: 'tenant',
    authProvider: 'firebase',
    accountStatus: 'active',
  });

  const response = await request(testApp)
    .post('/api/auth/firebase/login')
    .send({ idToken: 'existing-firebase-token' });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.id, 'firebase-user');
  assert.equal(response.body.user.role, 'tenant');
});

test('rejects public admin registration without verifying Google credentials', async () => {
  const response = await request(testApp)
    .post('/api/auth/google/register')
    .send({ accessToken: 'valid-google-token', role: 'admin' });

  assert.equal(response.status, 400);
  assert.equal(users.has('new-user'), false);
});

test('logs in an existing active account using its saved database role', async () => {
  const response = await request(testApp)
    .post('/api/auth/google/login')
    .send({ accessToken: 'existing-google-token' });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'admin');
  assert.equal(response.body.user.id, 'existing-user');
});

test('serves profile information only to the authenticated user', async () => {
  const unauthorized = await request(testApp).get('/api/users/me');
  assert.equal(unauthorized.status, 401);

  const authorized = await request(testApp)
    .get('/api/users/me')
    .set('Authorization', 'Bearer signed-test-token');

  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.user.email, 'existing@example.com');
  assert.equal(authorized.body.user.role, 'admin');
});

test('rejects unsupported image types for both upload endpoints', async () => {
  const invalidImage = Buffer.from('not an image');
  const verificationResponse = await request(testApp)
    .post('/api/owner/verification')
    .set('Authorization', 'Bearer owner-test-token')
    .attach('frontImage', invalidImage, { filename: 'document.pdf', contentType: 'application/pdf' });

  assert.equal(verificationResponse.status, 400);
  assert.equal(verificationResponse.body.message, 'Upload the NID images as JPEG, PNG, or WebP files.');

  const propertyResponse = await request(testApp)
    .post('/api/properties')
    .set('Authorization', 'Bearer owner-test-token')
    .field('property', '{}')
    .attach('images', invalidImage, { filename: 'document.pdf', contentType: 'application/pdf' });

  assert.equal(propertyResponse.status, 400);
  assert.equal(propertyResponse.body.message, 'Upload property photos as JPEG, PNG, or WebP files.');
});

test('collects owner NID submissions and exposes the verified badge only after admin approval', async () => {
  const owner = users.get('owner-user');
  owner.isVerified = false;
  owner.ownerVerificationStatus = 'unverified';
  properties.push({
    _id: '650000000000000000000072',
    ownerId: owner._id,
    title: 'Owner property',
    status: 'Available',
  });
  const nidPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const tenantSubmission = await request(testApp)
    .post('/api/owner/verification')
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(tenantSubmission.status, 403);

  const submitted = await request(testApp)
    .post('/api/owner/verification')
    .set('Authorization', 'Bearer owner-test-token')
    .field('nidName', 'Property Owner')
    .field('nidNumber', '1234-5678-90123')
    .attach('frontImage', nidPng, { filename: 'front.png', contentType: 'image/png' })
    .attach('backImage', nidPng, { filename: 'back.png', contentType: 'image/png' });
  assert.equal(submitted.status, 201);
  assert.equal(verifications[0].nidNumber, '1234567890123');
  assert.equal(verifications[0].status, 'pending');
  assert.equal(owner.isVerified, false);
  const unapprovedListing = await request(testApp).get('/api/properties');
  assert.equal(unapprovedListing.body.properties[0].isVerified, false);

  const ownerStatus = await request(testApp)
    .get('/api/owner/verification')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(ownerStatus.body.verification.status, 'pending');
  assert.equal(Object.hasOwn(ownerStatus.body.verification, 'nidNumber'), false);

  const queue = await request(testApp)
    .get('/api/admin/owner-verifications')
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(queue.status, 403);

  const adminQueue = await request(testApp)
    .get('/api/admin/owner-verifications')
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(adminQueue.status, 200);
  assert.equal(adminQueue.body.verifications[0].nidNumber, '1234567890123');

  const deniedDocument = await request(testApp)
    .get('/api/admin/owner-verifications/650000000000000000000071/documents/front')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(deniedDocument.status, 403);

  const document = await request(testApp)
    .get('/api/admin/owner-verifications/650000000000000000000071/documents/front')
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(document.status, 200);
  assert.equal(document.headers['content-type'], 'image/png');
  assert.equal(document.headers['cache-control'], 'private, no-store');
  assert.deepEqual(document.body, nidPng);

  const approved = await request(testApp)
    .patch('/api/admin/owner-verifications/650000000000000000000071')
    .set('Authorization', 'Bearer signed-test-token')
    .send({ decision: 'approve' });
  assert.equal(approved.status, 200);
  assert.equal(owner.ownerVerificationStatus, 'approved');
  assert.equal(owner.isVerified, true);
  const approvedListing = await request(testApp).get('/api/properties');
  assert.equal(approvedListing.body.properties[0].isVerified, true);

  const publicStatus = await request(testApp)
    .get('/api/users/me')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(publicStatus.body.user.isVerified, true);
});

test('updates allowed profile fields without allowing role escalation', async () => {
  const response = await request(testApp)
    .put('/api/users/me')
    .set('Authorization', 'Bearer signed-test-token')
    .send({ fullName: 'Updated Name', role: 'owner', occupation: 'Engineer', isVerified: true });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.fullName, 'Updated Name');
  assert.equal(response.body.user.occupation, 'Engineer');
  assert.equal(response.body.user.isVerified, false);
  assert.equal(response.body.user.role, 'admin');
});

test('allows tenants and owners to save, list, and remove available properties', async () => {
  const propertyId = '650000000000000000000051';
  properties.push({
    _id: propertyId,
    ownerId: 'owner-user',
    title: 'Sunny apartment',
    accommodation_type: 'Apartment',
    city: 'Dhaka',
    location: 'Dhanmondi',
    monthly_rent: 30000,
    number_of_rooms: 2,
    bedrooms: 2,
    bathrooms: 1,
    images: ['https://example.com/home.png'],
    status: 'Available',
  });

  const unauthorized = await request(testApp)
    .put(`/api/users/me/watchlist/${propertyId}`)
    .send({ watched: true });
  assert.equal(unauthorized.status, 401);

  for (const [token, userId] of [['tenant-test-token', 'tenant-user'], ['owner-test-token', 'owner-user']]) {
    const saved = await request(testApp)
      .put(`/api/users/me/watchlist/${propertyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ watched: true });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.watched, true);
    assert.equal(users.get(userId).watchlist.length, 1);

    const watchlist = await request(testApp)
      .get('/api/users/me/watchlist')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(watchlist.status, 200);
    assert.equal(watchlist.body.properties.length, 1);
    assert.equal(watchlist.body.properties[0]._id, propertyId);
    assert.equal(watchlist.body.properties[0].title, 'Sunny apartment');

    const removed = await request(testApp)
      .put(`/api/users/me/watchlist/${propertyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ watched: false });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.watched, false);
    assert.deepEqual(users.get(userId).watchlist, []);
  }
});

test('accepts listing reports and restricts report review to admins', async () => {
  const propertyId = '650000000000000000000061';
  properties.push({
    _id: propertyId,
    ownerId: 'owner-user',
    title: 'Questionable room',
    status: 'Available',
  });

  const unauthenticated = await request(testApp)
    .post(`/api/properties/${propertyId}/reports`)
    .send({ category: 'scam' });
  assert.equal(unauthenticated.status, 401);

  const invalidCategory = await request(testApp)
    .post(`/api/properties/${propertyId}/reports`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({ category: 'not-a-reason' });
  assert.equal(invalidCategory.status, 400);

  const ownListing = await request(testApp)
    .post(`/api/properties/${propertyId}/reports`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ category: 'scam' });
  assert.equal(ownListing.status, 403);

  const submitted = await request(testApp)
    .post(`/api/properties/${propertyId}/reports`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({ category: 'scam', details: '  Suspicious payment request.  ' });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.report.category, 'scam');
  assert.equal(reports[0].details, 'Suspicious payment request.');
  assert.equal(reports[0].propertyTitle, 'Questionable room');
  assert.equal(reports[0].reporterId, 'tenant-user');

  const forbidden = await request(testApp)
    .get('/api/admin/reports')
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(forbidden.status, 403);

  const reviewQueue = await request(testApp)
    .get('/api/admin/reports')
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(reviewQueue.status, 200);
  assert.equal(reviewQueue.body.reports.length, 1);
  assert.equal(reviewQueue.body.reports[0].propertyId, propertyId);
});

test('admin workspace endpoints restrict access and allow moderation', async () => {
  const postId = '650000000000000000000074';
  const reportId = '650000000000000000000075';
  properties.push({
    _id: postId,
    ownerId: 'owner-user',
    title: 'Admin review listing',
    city: 'Dhaka',
    location: 'Dhanmondi',
    monthly_rent: 25000,
    status: 'Available',
    createdAt: new Date(),
  });
  reports.push({
    _id: reportId,
    propertyId: postId,
    propertyTitle: 'Admin review listing',
    reporterId: 'tenant-user',
    category: 'scam',
    details: 'Needs review',
    status: 'pending',
    createdAt: new Date(),
  });

  const forbidden = await request(testApp)
    .get('/api/admin/summary')
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(forbidden.status, 403);

  const summary = await request(testApp)
    .get('/api/admin/summary')
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(summary.status, 200);
  assert.equal(summary.body.summary.posts, 1);
  assert.equal(summary.body.summary.pendingReports, 1);

  const userList = await request(testApp)
    .get('/api/admin/users')
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(userList.status, 200);
  assert.equal(userList.body.users.find((user) => user.id === 'owner-user').isVerified, true);

  const suspend = await request(testApp)
    .patch('/api/admin/users/650000000000000000000073/status')
    .set('Authorization', 'Bearer signed-test-token')
    .send({ accountStatus: 'suspended' });
  assert.equal(suspend.status, 200);
  assert.equal(users.get('650000000000000000000073').accountStatus, 'suspended');
  const reactivate = await request(testApp)
    .patch('/api/admin/users/650000000000000000000073/status')
    .set('Authorization', 'Bearer signed-test-token')
    .send({ accountStatus: 'active' });
  assert.equal(reactivate.status, 200);

  const postList = await request(testApp)
    .get('/api/admin/posts')
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(postList.status, 200);
  assert.equal(postList.body.posts[0].owner.fullName, 'Property Owner');

  const removeForbidden = await request(testApp)
    .delete(`/api/admin/posts/${postId}`)
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(removeForbidden.status, 403);
  const removed = await request(testApp)
    .delete(`/api/admin/posts/${postId}`)
    .set('Authorization', 'Bearer signed-test-token');
  assert.equal(removed.status, 200);
  assert.equal(properties.length, 0);

  const reviewed = await request(testApp)
    .patch(`/api/admin/reports/${reportId}`)
    .set('Authorization', 'Bearer signed-test-token')
    .send({ status: 'reviewed' });
  assert.equal(reviewed.status, 200);
  assert.equal(reports[0].status, 'reviewed');
});

test('creates an owner listing with verified email and an unrated default', async () => {
  const payload = {
    title: 'Room in Dhanmondi',
    accommodation_type: 'Rental room',
    city: 'Dhaka',
    location: 'Dhanmondi',
    monthly_rent: 25000,
    number_of_rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    gender: 'any',
    email: 'spoofed@example.com',
  };
  const unauthorized = await request(testApp).post('/api/properties').send(payload);
  assert.equal(unauthorized.status, 401);

  const response = await request(testApp)
    .post('/api/properties')
    .set('Authorization', 'Bearer owner-test-token')
    .send(payload);

  assert.equal(response.status, 201);
  assert.equal(response.body.property.email, 'owner@example.com');
  assert.equal(response.body.property.gender, 'any');
  assert.equal(response.body.property.rating, 0);
  assert.equal(properties.length, 1);
});

test('lets an owner update their listing while retaining selected photos', async () => {
  const propertyId = '650000000000000000000078';
  const photoId = '650000000000000000000079';
  const photoBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  properties.push({
    _id: propertyId,
    ownerId: 'owner-user',
    title: 'Old listing title',
    images: [{
      _id: photoId,
      data: new mongoose.mongo.BSON.Binary(photoBytes),
      mimeType: 'image/png',
    }],
  });
  const payload = {
    title: 'Updated listing title',
    description: 'Updated details',
    accommodation_type: 'Rental room',
    city: 'Dhaka',
    location: 'Dhanmondi',
    address: '12 Lake Road',
    monthly_rent: 30000,
    number_of_rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    facilities: ['Wi-Fi'],
    images: [`/api/property-images/${propertyId}/${photoId}`],
    status: 'Available',
    gender: 'any',
  };
  const newPhoto = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
  const response = await request(testApp)
    .put(`/api/properties/${propertyId}`)
    .set('Authorization', 'Bearer owner-test-token')
    .field('property', JSON.stringify(payload))
    .attach('images', newPhoto, { filename: 'new-room.png', contentType: 'image/png' });

  assert.equal(response.status, 200);
  assert.equal(response.body.property.title, 'Updated listing title');
  assert.equal(response.body.property.monthly_rent, 30000);
  assert.equal(properties[0].images.length, 2);
  assert.deepEqual(properties[0].images[0].data.value(true), photoBytes);
  assert.deepEqual(properties[0].images[1].data.value(true), newPhoto);
});

test('restricts owner listing edits and deletes to the listing owner', async () => {
  const propertyId = '650000000000000000000078';
  properties.push({
    _id: propertyId,
    ownerId: 'tenant-user',
    title: 'Another user listing',
    images: [],
  });

  const update = await request(testApp)
    .put(`/api/properties/${propertyId}`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ images: [] });
  assert.equal(update.status, 404);

  const deletion = await request(testApp)
    .delete(`/api/properties/${propertyId}`)
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(deletion.status, 404);
  assert.equal(properties.length, 1);
});

test('lets an owner delete their listing and its legacy photos', async () => {
  const propertyId = '650000000000000000000078';
  properties.push({ _id: propertyId, ownerId: 'owner-user', title: 'Listing to remove', images: [] });
  propertyImages.push({
    _id: '650000000000000000000079',
    propertyId,
    data: Buffer.from('legacy image'),
    mimeType: 'image/png',
  });

  const response = await request(testApp)
    .delete(`/api/properties/${propertyId}`)
    .set('Authorization', 'Bearer owner-test-token');

  assert.equal(response.status, 200);
  assert.equal(properties.length, 0);
  assert.equal(propertyImages.length, 0);
});

test('stores multiple binary images in accopost.images and serves their original bytes', async () => {
  const payload = {
    title: 'Photo property',
    accommodation_type: 'Rental room',
    city: 'Dhaka',
    location: 'Dhanmondi',
    monthly_rent: 25000,
    number_of_rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    facilities: ['Wi-Fi'],
    images: [],
    gender: 'any',
  };
  const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const secondImageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
  const submitted = await request(testApp)
    .post('/api/properties')
    .set('Authorization', 'Bearer owner-test-token')
    .field('property', JSON.stringify(payload))
    .attach('images', imageBytes, { filename: 'room.png', contentType: 'image/png' })
    .attach('images', secondImageBytes, { filename: 'kitchen.png', contentType: 'image/png' });

  assert.equal(submitted.status, 201);
  assert.equal(propertyImages.length, 0);
  assert.equal(properties[0].images.length, 2);
  assert.ok(properties[0].images.every((image) => image.data instanceof mongoose.mongo.BSON.Binary));
  assert.deepEqual(
    properties[0].images.map((image) => image.data.value(true)),
    [imageBytes, secondImageBytes],
  );
  assert.equal(Object.hasOwn(properties[0], 'photos'), false);
  assert.deepEqual(submitted.body.property.images, properties[0].images.map((image) => (
    `/api/property-images/650000000000000000000078/${image._id}`
  )));
  const publicListing = await request(testApp).get('/api/properties');
  assert.equal(publicListing.status, 200);
  assert.deepEqual(publicListing.body.properties[0].images, submitted.body.property.images);
  assert.equal(JSON.stringify(publicListing.body).includes('data:image/'), false);

  const fetched = await request(testApp)
    .get(submitted.body.property.images[0]);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers['content-type'], 'image/png');
  assert.equal(fetched.headers['cross-origin-resource-policy'], 'cross-origin');
  assert.deepEqual(fetched.body, imageBytes);

  const secondFetched = await request(testApp)
    .get(submitted.body.property.images[1]);
  assert.equal(secondFetched.status, 200);
  assert.deepEqual(secondFetched.body, secondImageBytes);

  properties[0].status = 'Rented';
  const rentedPropertyImage = await request(testApp)
    .get(submitted.body.property.images[0]);
  assert.equal(rentedPropertyImage.status, 200);
  assert.deepEqual(rentedPropertyImage.body, imageBytes);
});

test('allows cross-origin display for legacy property image URLs', async () => {
  const propertyId = '650000000000000000000078';
  const imageId = '650000000000000000000079';
  const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  properties.push({ _id: propertyId, ownerId: 'owner-user', status: 'Available' });
  propertyImages.push({
    _id: imageId,
    propertyId,
    data: imageBytes,
    mimeType: 'image/png',
  });

  const response = await request(testApp).get(`/api/property-images/${imageId}`);

  assert.equal(response.status, 200);
  assert.equal(response.headers['cross-origin-resource-policy'], 'cross-origin');
  assert.deepEqual(response.body, imageBytes);
});

test('enforces a MongoDB-safe combined property photo size limit', () => {
  const maxBytes = 12 * 1024 * 1024;

  assert.equal(appModule.isPropertyPhotoUploadWithinLimit([{ size: maxBytes }]), true);
  assert.equal(appModule.isPropertyPhotoUploadWithinLimit([{ size: maxBytes + 1 }]), false);
  assert.equal(appModule.isPropertyPhotoUploadWithinLimit([
    { size: 5 * 1024 * 1024 },
    { size: 5 * 1024 * 1024 },
    { size: 2 * 1024 * 1024 + 1 },
  ]), false);
});

test('stores BSON image bytes only in the accopost images field', () => {
  const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0x01]);
  const property = new Accommodation({
    title: 'Binary photo property',
    accommodation_type: 'Rental room',
    city: 'Dhaka',
    location: 'Dhanmondi',
    monthly_rent: 25000,
    number_of_rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    gender: 'any',
    email: 'owner@example.com',
    ownerId: new mongoose.Types.ObjectId(),
    images: [{
      _id: new mongoose.Types.ObjectId(),
      data: mongoose.mongo.BSON.Binary.createFromBase64(imageBytes.toString('base64')),
      mimeType: 'image/jpeg',
    }],
  });

  assert.ok(property.images[0].data instanceof mongoose.mongo.BSON.Binary);
  assert.equal(property.images[0].data.value(true).equals(imageBytes), true);
  assert.equal(Accommodation.schema.path('photos'), undefined);
});

test('migrates embedded images from photos into images and removes the old field', async () => {
  const collection = Accommodation.collection;
  const originalUpdateMany = collection.updateMany;
  let migrationQuery;
  let migrationPipeline;
  collection.updateMany = async (query, pipeline) => {
    migrationQuery = query;
    migrationPipeline = pipeline;
    return { modifiedCount: 2 };
  };

  try {
    const migratedCount = await Accommodation.migrateLegacyPhotos();
    assert.equal(migratedCount, 2);
    assert.deepEqual(migrationQuery, { photos: { $exists: true } });
    assert.deepEqual(migrationPipeline[0], {
      $set: {
        images: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ['$photos', []] } }, 0] },
            '$photos',
            '$images',
          ],
        },
      },
    });
    assert.deepEqual(migrationPipeline[1], { $unset: 'photos' });
  } finally {
    collection.updateMany = originalUpdateMany;
  }
});

test('prevents non-owners from creating property listings', async () => {
  const response = await request(testApp)
    .post('/api/properties')
    .set('Authorization', 'Bearer signed-test-token')
    .send({});

  assert.equal(response.status, 403);
  assert.equal(properties.length, 0);
});

test('returns only the authenticated owner’s listings', async () => {
  properties.push(
    { _id: 'owner-listing', ownerId: 'owner-user', title: 'Owner room' },
    { _id: 'other-listing', ownerId: 'another-owner', title: 'Other room' },
  );

  const unauthorized = await request(testApp).get('/api/properties/mine');
  assert.equal(unauthorized.status, 401);

  const response = await request(testApp)
    .get('/api/properties/mine')
    .set('Authorization', 'Bearer owner-test-token');

  assert.equal(response.status, 200);
  assert.equal(response.body.properties.length, 1);
  assert.equal(response.body.properties[0].title, 'Owner room');
});

test('returns only available public listings with a safe owner verification flag', async () => {
  properties.push(
    {
      _id: 'available-listing',
      ownerId: 'owner-user',
      title: 'Verified room',
      status: 'Available',
      rating: 4.7,
      address: '12 Lake Road',
      email: 'owner@example.com',
    },
    { _id: 'rented-listing', ownerId: 'owner-user', title: 'Rented room', status: 'Rented' },
  );

  const response = await request(testApp).get('/api/properties');

  assert.equal(response.status, 200);
  assert.equal(response.body.properties.length, 1);
  assert.equal(response.body.properties[0].title, 'Verified room');
  assert.equal(response.body.properties[0].address, '12 Lake Road');
  assert.equal(response.body.properties[0].isVerified, true);
  assert.equal(Object.hasOwn(response.body.properties[0], 'ownerId'), false);
  assert.equal(Object.hasOwn(response.body.properties[0], 'email'), false);
});

test('serves public property details and accepts authenticated comments', async () => {
  const propertyId = '650000000000000000000001';
  const parentCommentId = '650000000000000000000002';
  properties.push({
    _id: propertyId,
    ownerId: 'owner-user',
    title: 'Verified room',
    status: 'Available',
    description: 'A bright room near transit.',
    comments: [{
      _id: parentCommentId,
      userId: 'tenant-user',
      author: 'Helpful Tenant',
      text: 'Does the room get sunlight?',
      createdAt: new Date(),
      replies: [],
    }],
  });

  const details = await request(testApp).get(`/api/properties/${propertyId}`);
  assert.equal(details.status, 200);
  assert.equal(details.body.property.owner.fullName, 'Property Owner');
  assert.equal(details.body.property.owner.isVerified, true);
  assert.equal(details.body.property.comments.length, 1);
  assert.deepEqual(details.body.property.comments[0].replies, []);

  const anonymousComment = await request(testApp)
    .post(`/api/properties/${propertyId}/comments`)
    .send({ text: 'Is this still available?' });
  assert.equal(anonymousComment.status, 401);

  const emptyComment = await request(testApp)
    .post(`/api/properties/${propertyId}/comments`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ text: '   ' });
  assert.equal(emptyComment.status, 400);

  const comment = await request(testApp)
    .post(`/api/properties/${propertyId}/comments`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ text: ' Is this still available? ', author: 'Unverified Name' });
  assert.equal(comment.status, 201);
  assert.equal(comment.body.comment.author, 'Property Owner');
  assert.equal(comment.body.comment.text, 'Is this still available?');

  const anonymousReply = await request(testApp)
    .post(`/api/properties/${propertyId}/comments/${parentCommentId}/replies`)
    .send({ text: 'Yes, it is.' });
  assert.equal(anonymousReply.status, 401);

  const emptyReply = await request(testApp)
    .post(`/api/properties/${propertyId}/comments/${parentCommentId}/replies`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ text: '  ' });
  assert.equal(emptyReply.status, 400);

  const reply = await request(testApp)
    .post(`/api/properties/${propertyId}/comments/${parentCommentId}/replies`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ text: ' Yes, it is. ', author: 'Spoofed Name' });
  assert.equal(reply.status, 201);
  assert.equal(reply.body.reply.author, 'Property Owner');
  assert.equal(reply.body.reply.text, 'Yes, it is.');

  const updatedDetails = await request(testApp).get(`/api/properties/${propertyId}`);
  assert.equal(updatedDetails.body.property.comments.length, 2);
  assert.equal(updatedDetails.body.property.comments[0].replies.length, 1);
  assert.equal(updatedDetails.body.property.comments[0].replies[0].text, 'Yes, it is.');

  const ownerNotifications = await request(testApp)
    .get('/api/users/me/notifications')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(ownerNotifications.status, 200);
  assert.equal(ownerNotifications.body.notifications.length, 0);

  const tenantNotifications = await request(testApp)
    .get('/api/users/me/notifications')
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(tenantNotifications.body.notifications.length, 1);
  assert.equal(tenantNotifications.body.notifications[0].type, 'reply');
  assert.equal(tenantNotifications.body.notifications[0].commentId, parentCommentId);
  assert.equal(tenantNotifications.body.notifications[0].replyId, '650000000000000000000004');
});

test('notifies the listing owner about another user’s comment and reply only', async () => {
  const propertyId = '650000000000000000000011';
  properties.push({
    _id: propertyId,
    ownerId: 'owner-user',
    title: 'Owner listing',
    status: 'Available',
    comments: [],
  });

  const comment = await request(testApp)
    .post(`/api/properties/${propertyId}/comments`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({ text: 'Can I arrange a viewing?' });
  assert.equal(comment.status, 201);

  let notifications = await request(testApp)
    .get('/api/users/me/notifications')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(notifications.status, 200);
  assert.equal(notifications.body.unreadCount, 1);
  assert.equal(notifications.body.notifications[0].type, 'comment');
  assert.equal(String(notifications.body.notifications[0].propertyId), propertyId);
  assert.equal(notifications.body.notifications[0].commentId, '650000000000000000000003');

  const reply = await request(testApp)
    .post(`/api/properties/${propertyId}/comments/650000000000000000000003/replies`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({ text: 'I can come this weekend.' });
  assert.equal(reply.status, 201);

  notifications = await request(testApp)
    .get('/api/users/me/notifications')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(notifications.body.unreadCount, 2);
  const replyNotification = notifications.body.notifications.find((item) => item.type === 'reply');
  assert.equal(replyNotification.replyId, '650000000000000000000004');

  const notificationId = replyNotification._id;
  const markedRead = await request(testApp)
    .put(`/api/users/me/notifications/${notificationId}/read`)
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(markedRead.status, 200);
  assert.equal(markedRead.body.notification.isRead, true);
});

test('lets tenants request contact and owners decide with the listing identified', async () => {
  const propertyId = '650000000000000000000041';
  properties.push({
    _id: propertyId,
    ownerId: 'owner-user',
    title: 'Dhanmondi room',
    city: 'Dhaka',
    location: 'Dhanmondi',
    status: 'Available',
    contactRequests: [],
  });

  const ownerRequest = await request(testApp)
    .post(`/api/properties/${propertyId}/contact-requests`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({});
  assert.equal(ownerRequest.status, 403);

  const created = await request(testApp)
    .post(`/api/properties/${propertyId}/contact-requests`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({});
  assert.equal(created.status, 201);
  assert.equal(created.body.contactRequest.propertyTitle, 'Dhanmondi room');

  const tenantRequest = await request(testApp)
    .get(`/api/properties/${propertyId}/contact-requests/mine`)
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(tenantRequest.status, 200);
  assert.equal(tenantRequest.body.contactRequest.status, 'pending');

  const pendingContact = await request(testApp)
    .get(`/api/properties/${propertyId}/contact-details`)
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(pendingContact.status, 403);

  const ownerNotifications = await request(testApp)
    .get('/api/users/me/notifications')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(ownerNotifications.body.notifications[0].type, 'contact-request');
  assert.equal(ownerNotifications.body.notifications[0].contactRequestId, created.body.contactRequest._id);

  const duplicate = await request(testApp)
    .post(`/api/properties/${propertyId}/contact-requests`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({});
  assert.equal(duplicate.status, 409);

  const ownerRequests = await request(testApp)
    .get('/api/owner/contact-requests')
    .set('Authorization', 'Bearer owner-test-token');
  assert.equal(ownerRequests.status, 200);
  assert.equal(ownerRequests.body.contactRequests.length, 1);
  assert.equal(ownerRequests.body.contactRequests[0].property.title, 'Dhanmondi room');
  assert.equal(ownerRequests.body.contactRequests[0].requesterEmail, 'tenant@example.com');

  const requestId = ownerRequests.body.contactRequests[0]._id;
  const rejectedByTenant = await request(testApp)
    .put(`/api/owner/contact-requests/${requestId}`)
    .set('Authorization', 'Bearer tenant-test-token')
    .send({ status: 'accepted' });
  assert.equal(rejectedByTenant.status, 403);

  const decision = await request(testApp)
    .put(`/api/owner/contact-requests/${requestId}`)
    .set('Authorization', 'Bearer owner-test-token')
    .send({ status: 'accepted' });
  assert.equal(decision.status, 200);
  assert.equal(decision.body.contactRequest.status, 'accepted');

  const acceptedContact = await request(testApp)
    .get(`/api/properties/${propertyId}/contact-details`)
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(acceptedContact.status, 200);
  assert.equal(acceptedContact.body.owner.fullName, 'Property Owner');
  assert.equal(acceptedContact.body.owner.occupation, 'Architect');
  assert.equal(acceptedContact.body.owner.phone, '+8801712345678');
  assert.equal(acceptedContact.body.owner.email, 'owner@example.com');

  const tenantNotifications = await request(testApp)
    .get('/api/users/me/notifications')
    .set('Authorization', 'Bearer tenant-test-token');
  assert.equal(tenantNotifications.body.notifications.length, 1);
  assert.equal(tenantNotifications.body.notifications[0].type, 'contact-request-decision');
  assert.equal(tenantNotifications.body.notifications[0].propertyTitle, 'Dhanmondi room');
});
