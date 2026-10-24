const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const request = require('supertest');
const appModule = require('../src/app');

const app = appModule.createApp;
const users = new Map();
const properties = [];

const UserModel = {
  async findOne(query) {
    return [...users.values()].find((user) => (
      Object.entries(query).every(([field, value]) => user[field] === value)
    )) || null;
  },
  async findById(id) {
    return users.get(String(id)) || null;
  },
  async create(fields) {
    const user = { _id: 'new-user', accountStatus: 'active', ...fields };
    users.set(String(user._id), user);
    return user;
  },
  async findOneAndUpdate(query, update) {
    const user = users.get(String(query._id));
    if (!user || user.accountStatus !== query.accountStatus) return null;
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
    } else {
      Object.assign(user, update.$set);
    }
    return user;
  },
};

function createTestApp() {
  users.clear();
  properties.length = 0;
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

  return app({
    UserModel,
    AccommodationModel: {
      async create(fields) {
        const property = { _id: 'new-property', ...fields };
        properties.push(property);
        return property;
      },
      find(query) {
        const matchingProperties = properties.filter((property) => Object.entries(query).every(([field, value]) => {
          if (field === 'contactRequests.0') return property.contactRequests?.length > 0;
          return String(property[field]) === String(value);
        }));
        return {
          sort() {
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
                ownerId: owner ? { _id: owner._id, isVerified: owner.isVerified } : property.ownerId,
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
          async lean() {
            if (!property) return null;
            const owner = users.get(String(property.ownerId));
            return {
              ...property,
              ownerId: owner ? {
                fullName: owner.fullName,
                isVerified: owner.isVerified,
                email: owner.email,
                phone: owner.phone,
                occupation: owner.occupation,
              } : property.ownerId,
            };
          },
        };
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
