const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const ownerId = '650000000000000000000201';
const tenantId = '650000000000000000000202';
const otherId = '650000000000000000000203';
const propertyId = '650000000000000000000204';
const itemId = '650000000000000000000205';
const conversationId = '650000000000000000000206';
const users = new Map([
  [ownerId, { _id: ownerId, fullName: 'Home Owner', role: 'owner', accountStatus: 'active', notifications: [] }],
  [tenantId, { _id: tenantId, fullName: 'Home Seeker', role: 'tenant', accountStatus: 'active', notifications: [] }],
  [otherId, { _id: otherId, fullName: 'Other User', role: 'tenant', accountStatus: 'active', notifications: [] }],
]);
const property = {
  _id: propertyId,
  title: 'Sunny apartment',
  status: 'Available',
  ownerId,
};
const item = {
  _id: itemId,
  title: 'Study desk',
  status: 'available',
  sellerId: ownerId,
};
const conversations = new Map();
const messages = [];
let app;

const queryResult = (value) => ({
  sort() { return this; },
  limit() { return this; },
  async lean() { return value; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const UserModel = {
  async findById(id) {
    return users.get(String(id)) || null;
  },
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
};

const ConversationModel = {
  find(query) {
    const matching = [...conversations.values()].filter((conversation) => (
      conversation.participants.some((participant) => String(participant.userId) === String(query['participants.userId']))
    ));
    return queryResult(matching.sort((first, second) => second.updatedAt - first.updatedAt));
  },
  findOne(query) {
    const conversation = conversations.get(String(query._id));
    const authorized = conversation?.participants.some(
      (participant) => String(participant.userId) === String(query['participants.userId']),
    );
    return queryResult(authorized ? conversation : null);
  },
  async findOneAndUpdate(query, update) {
    let conversation = [...conversations.values()].find(
      (entry) => entry.conversationKey === query.conversationKey,
    );
    if (!conversation) {
      conversation = {
        _id: conversationId,
        ...update.$setOnInsert,
        participants: update.$setOnInsert.participants.map((participant) => ({
          unreadCount: 0,
          ...participant,
        })),
        lastMessage: '',
        updatedAt: new Date(),
      };
      conversations.set(conversationId, conversation);
    }
    return conversation;
  },
  async updateOne(query, update, options = {}) {
    const conversation = conversations.get(String(query._id));
    if (!conversation) return;
    if (update.$set?.lastMessage !== undefined) conversation.lastMessage = update.$set.lastMessage;
    const recipientId = options.arrayFilters?.[0]?.['recipient.userId'];
    const participantId = recipientId || query['participants.userId'];
    const participant = conversation.participants.find(
      (entry) => String(entry.userId) === String(participantId),
    );
    if (participant && update.$inc?.['participants.$[recipient].unreadCount']) {
      participant.unreadCount += update.$inc['participants.$[recipient].unreadCount'];
    }
    if (participant && update.$set?.['participants.$.unreadCount'] !== undefined) {
      participant.unreadCount = update.$set['participants.$.unreadCount'];
    }
    conversation.updatedAt = new Date();
  },
};

const ChatMessageModel = {
  async create(fields) {
    const message = {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      ...fields,
    };
    messages.push(message);
    return message;
  },
  find(query) {
    const matching = messages.filter(
      (message) => String(message.conversationId) === String(query.conversationId),
    );
    return queryResult(matching.slice(-100).reverse());
  },
};

beforeEach(() => {
  conversations.clear();
  messages.length = 0;
  for (const user of users.values()) user.notifications = [];
  app = createApp({
    UserModel,
    AccommodationModel: {
      findById: (id) => queryResult(String(id) === propertyId ? property : null),
    },
    MarketplaceItemModel: {
      findById: (id) => queryResult(String(id) === itemId ? item : null),
    },
    ConversationModel,
    ChatMessageModel,
    tokenVerifier(token) {
      if (token === 'owner-token') return ownerId;
      if (token === 'tenant-token') return tenantId;
      if (token === 'other-token') return otherId;
      throw new Error('Invalid token.');
    },
    jwtSecret: 'test-secret',
    clientOrigins: 'http://localhost:3000',
  });
});

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

test('starts private property and marketplace chats, tracks unread messages, and restricts access', async () => {
  const startResponse = await request(app)
    .post('/api/chats/start')
    .set(auth('tenant-token'))
    .send({ listingType: 'property', listingId: propertyId, text: 'Is the apartment still available?' });

  assert.equal(startResponse.status, 201);
  assert.equal(startResponse.body.conversation.listingTitle, property.title);
  assert.equal(startResponse.body.message.text, 'Is the apartment still available?');
  assert.equal(users.get(ownerId).notifications[0].type, 'chat-message');
  const notificationsResponse = await request(app)
    .get('/api/users/me/notifications')
    .set(auth('owner-token'));
  assert.equal(String(notificationsResponse.body.notifications[0].chatId), conversationId);

  const ownerInbox = await request(app).get('/api/chats').set(auth('owner-token'));
  assert.equal(ownerInbox.body.chats.length, 1);
  assert.equal(ownerInbox.body.chats[0].unreadCount, 1);

  const ownerMessages = await request(app)
    .get(`/api/chats/${conversationId}/messages`)
    .set(auth('owner-token'));
  assert.equal(ownerMessages.body.messages.length, 1);
  assert.equal(ownerMessages.body.messages[0].senderName, 'Home Seeker');
  assert.equal(conversations.get(conversationId).participants[1].unreadCount, 0);

  const replyResponse = await request(app)
    .post(`/api/chats/${conversationId}/messages`)
    .set(auth('owner-token'))
    .send({ text: 'Yes, it is available.' });
  assert.equal(replyResponse.status, 201);
  assert.equal(users.get(tenantId).notifications[0].type, 'chat-message');

  const unauthorizedResponse = await request(app)
    .get(`/api/chats/${conversationId}/messages`)
    .set(auth('other-token'));
  assert.equal(unauthorizedResponse.status, 404);

  const marketplaceResponse = await request(app)
    .post('/api/chats/start')
    .set(auth('tenant-token'))
    .send({ listingType: 'marketplace', listingId: itemId, text: 'Can I pick this up today?' });
  assert.equal(marketplaceResponse.status, 201);
  assert.equal(marketplaceResponse.body.conversation.listingType, 'marketplace');
});

test('rejects empty messages, unavailable listings, and messages to your own post', async () => {
  const emptyResponse = await request(app)
    .post('/api/chats/start')
    .set(auth('tenant-token'))
    .send({ listingType: 'property', listingId: propertyId, text: '  ' });
  assert.equal(emptyResponse.status, 400);

  const ownPostResponse = await request(app)
    .post('/api/chats/start')
    .set(auth('owner-token'))
    .send({ listingType: 'marketplace', listingId: itemId, text: 'My own item' });
  assert.equal(ownPostResponse.status, 403);

  item.status = 'sold';
  const unavailableResponse = await request(app)
    .post('/api/chats/start')
    .set(auth('tenant-token'))
    .send({ listingType: 'marketplace', listingId: itemId, text: 'Is this available?' });
  assert.equal(unavailableResponse.status, 404);
  item.status = 'available';
});
