const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const sellerId = '650000000000000000000101';
const buyerId = '650000000000000000000102';
const itemId = '650000000000000000000103';
const users = new Map([
  [sellerId, { _id: sellerId, fullName: 'Tenant Seller', email: 'seller@example.com', role: 'tenant', accountStatus: 'active' }],
  [buyerId, { _id: buyerId, fullName: 'Owner Buyer', email: 'buyer@example.com', role: 'owner', accountStatus: 'active' }],
]);
const items = [];

function createMarketplaceModel() {
  const matches = (item, query) => Object.entries(query).every(([field, value]) => {
    if (field === 'offers.buyerId') {
      return item.offers.some((offer) => String(offer.buyerId) === String(value));
    }
    return String(item[field]) === String(value);
  });
  return {
    async create(fields) {
      const item = {
        _id: itemId,
        status: 'available',
        images: [],
        offers: [],
        comments: [],
        createdAt: new Date(),
        ...fields,
        images: (fields.images || []).map((image) => ({
          ...image,
          data: Buffer.from(image.data.value(true)),
        })),
        async save() {},
        toObject() {
          return {
            ...this,
            save: undefined,
            toObject: undefined,
          };
        },
      };
      items.push(item);
      return item;
    },
    find(query) {
      const results = items.filter((item) => matches(item, query));
      return {
        sort() { return this; },
        async lean() { return results; },
      };
    },
    findById(id) {
      const item = items.find((entry) => String(entry._id) === String(id));
      return {
        lean: async () => item || null,
        then(resolve, reject) {
          return Promise.resolve(item || null).then(resolve, reject);
        },
      };
    },
    async findOneAndUpdate(query, update) {
      const item = items.find((entry) => (
        String(entry._id) === String(query._id)
        && (!query.status || entry.status === query.status)
        && (!query['comments._id'] || entry.comments.some(
          (comment) => String(comment._id) === String(query['comments._id']),
        ))
      ));
      if (!item) return null;
      if (update.$push.comments) {
        const [comment] = update.$push.comments.$each;
        item.comments.push({
          _id: new mongoose.Types.ObjectId(),
          replies: [],
          createdAt: new Date(),
          ...comment,
        });
      } else if (update.$push['comments.$.replies']) {
        const comment = item.comments.find((entry) => (
          String(entry._id) === String(query['comments._id'])
        ));
        const [reply] = update.$push['comments.$.replies'].$each;
        comment.replies.push({
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          ...reply,
        });
      }
      return item;
    },
  };
}

let app;
let marketplaceItems;

beforeEach(() => {
  items.length = 0;
  for (const user of users.values()) user.notifications = [];
  marketplaceItems = createMarketplaceModel();
  app = createApp({
    UserModel: {
      findById: async (id) => users.get(String(id)) || null,
      async findOneAndUpdate(query, update) {
        const user = users.get(String(query._id));
        if (!user || (query.accountStatus && user.accountStatus !== query.accountStatus)) return null;
        user.notifications.push(...update.$push.notifications.$each.map((notification) => ({
          _id: new mongoose.Types.ObjectId(),
          isRead: false,
          ...notification,
        })));
        return user;
      },
    },
    MarketplaceItemModel: marketplaceItems,
    tokenVerifier(token) {
      if (token === 'seller-token') return sellerId;
      if (token === 'buyer-token') return buyerId;
      throw new Error('Invalid token.');
    },
    jwtSecret: 'test-secret',
    clientOrigins: 'http://localhost:3000',
  });
});

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

test('allows a regular tenant to publish a marketplace listing without admin approval', async () => {
  const response = await request(app)
    .post('/api/marketplace/items')
    .set(auth('seller-token'))
    .send({
      title: 'Desk lamp',
      description: 'Works well.',
      price: 1200,
      condition: 'Good',
      location: 'Dhanmondi, Dhaka',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.item.sellerName, 'Tenant Seller');
  assert.equal(response.body.item.status, 'available');
  assert.equal(response.body.item.price, 1200);
});

test('lets users of different roles offer and respond to listings', async () => {
  const item = await marketplaceItems.create({
    title: 'Study chair',
    price: 2500,
    condition: 'Good',
    location: 'Dhaka',
    sellerId,
    sellerName: 'Tenant Seller',
  });

  const offerResponse = await request(app)
    .post(`/api/marketplace/items/${itemId}/offers`)
    .set(auth('buyer-token'))
    .send({ amount: 2000 });
  assert.equal(offerResponse.status, 201);
  assert.equal(offerResponse.body.offer.status, 'pending');
  assert.equal(Object.hasOwn(offerResponse.body.offer, 'buyerEmail'), false);
  assert.equal(users.get(sellerId).notifications[0].type, 'marketplace-offer');

  const offerId = '650000000000000000000104';
  item.offers[0]._id = offerId;
  const sellerResponse = await request(app)
    .patch(`/api/marketplace/items/${itemId}/offers/${offerId}`)
    .set(auth('seller-token'))
    .send({ status: 'accepted' });
  assert.equal(sellerResponse.status, 200);
  assert.equal(sellerResponse.body.offer.status, 'accepted');
  assert.equal(users.get(buyerId).notifications[0].type, 'marketplace-offer-decision');

  const soldResponse = await request(app)
    .patch(`/api/marketplace/items/${itemId}/status`)
    .set(auth('seller-token'))
    .send({ status: 'sold' });
  assert.equal(soldResponse.status, 200);
  assert.equal(soldResponse.body.item.status, 'sold');
});

test('allows comments and replies and notifies the item seller and comment author', async () => {
  await marketplaceItems.create({
    title: 'Desk lamp',
    price: 1200,
    condition: 'Good',
    location: 'Dhanmondi',
    sellerId,
    sellerName: 'Tenant Seller',
  });

  const commentResponse = await request(app)
    .post(`/api/marketplace/items/${itemId}/comments`)
    .set(auth('buyer-token'))
    .send({ text: 'Is pickup available?' });
  assert.equal(commentResponse.status, 201);
  const comment = commentResponse.body.comment;
  assert.equal(comment.text, 'Is pickup available?');
  assert.equal(String(users.get(sellerId).notifications[0].marketplaceItemId), itemId);
  assert.equal(String(users.get(sellerId).notifications[0].commentId), comment._id);

  const replyResponse = await request(app)
    .post(`/api/marketplace/items/${itemId}/comments/${comment._id}/replies`)
    .set(auth('seller-token'))
    .send({ text: 'Yes, pickup is available.' });
  assert.equal(replyResponse.status, 201);
  assert.equal(replyResponse.body.reply.text, 'Yes, pickup is available.');
  assert.equal(String(users.get(buyerId).notifications[0].marketplaceItemId), itemId);
  assert.equal(String(users.get(buyerId).notifications[0].replyId), replyResponse.body.reply._id);

  const notificationsResponse = await request(app)
    .get('/api/users/me/notifications')
    .set(auth('buyer-token'));
  assert.equal(notificationsResponse.status, 200);
  assert.equal(String(notificationsResponse.body.notifications[0].marketplaceItemId), itemId);
  assert.equal(notificationsResponse.body.notifications[0].type, 'reply');
});

test('keeps marketplace browsing public and only returns available items', async () => {
  await marketplaceItems.create({
    title: 'Available lamp',
    price: 1000,
    condition: 'Fair',
    location: 'Uttara',
    sellerId,
    sellerName: 'Tenant Seller',
  });
  const sold = await marketplaceItems.create({
    title: 'Sold table',
    price: 3000,
    condition: 'Good',
    location: 'Mirpur',
    sellerId,
    sellerName: 'Tenant Seller',
  });
  sold.status = 'sold';

  const response = await request(app).get('/api/marketplace/items');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map((item) => item.title), ['Available lamp']);
  assert.equal(Object.hasOwn(response.body.items[0], 'offers'), false);
});

test('stores uploaded item photos as binary data and serves them to the frontend origin', async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
  const createResponse = await request(app)
    .post('/api/marketplace/items')
    .set(auth('seller-token'))
    .field('item', JSON.stringify({
      title: 'Desk lamp',
      price: 1200,
      condition: 'Good',
      location: 'Dhanmondi',
    }))
    .attach('images', png, { filename: 'lamp.png', contentType: 'image/png' });

  assert.equal(createResponse.status, 201);
  const [imageUrl] = createResponse.body.item.images;
  assert.match(imageUrl, new RegExp(`/api/marketplace/images/${itemId}/[a-f\\d]{24}`));
  assert.ok(items[0].images[0].data instanceof Buffer);
  assert.deepEqual(items[0].images[0].data, png);

  const imageResponse = await request(app).get(imageUrl);

  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers['content-type'], 'image/png');
  assert.equal(imageResponse.headers['cross-origin-resource-policy'], 'cross-origin');
  assert.equal(imageResponse.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(imageResponse.body, png);
});
