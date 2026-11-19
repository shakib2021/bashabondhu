const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const { io: createClient } = require('socket.io-client');
const {
  createChatSocketServer,
  createSocketAuthenticator,
} = require('../src/realtime/chatSocket');

function createSocket(token) {
  return {
    handshake: { auth: { token } },
    data: {},
  };
}

test('socket authentication rejects missing or invalid tokens', async () => {
  const authenticate = createSocketAuthenticator({
    jwtSecret: 'test-secret',
    tokenVerifier(token) {
      if (token !== 'valid-token') throw new Error('Invalid token.');
      return 'active-user';
    },
    UserModel: {
      async findById() {
        return { _id: 'active-user', accountStatus: 'active' };
      },
    },
  });

  let missingTokenError;
  await authenticate(createSocket(undefined), (error) => { missingTokenError = error; });
  assert.match(missingTokenError.message, /Sign in/);

  let invalidTokenError;
  await authenticate(createSocket('invalid-token'), (error) => { invalidTokenError = error; });
  assert.match(invalidTokenError.message, /session has expired/);
});

test('socket authentication accepts active users and rejects inactive users', async () => {
  const authenticate = createSocketAuthenticator({
    jwtSecret: 'test-secret',
    tokenVerifier: () => 'active-user',
    UserModel: {
      async findById() {
        return { _id: 'active-user', accountStatus: 'active' };
      },
    },
  });
  const socket = createSocket('valid-token');
  let authenticationError;
  await authenticate(socket, (error) => { authenticationError = error; });
  assert.equal(authenticationError, undefined);
  assert.equal(socket.data.userId, 'active-user');

  const authenticateInactiveUser = createSocketAuthenticator({
    jwtSecret: 'test-secret',
    tokenVerifier: () => 'inactive-user',
    UserModel: {
      async findById() {
        return { _id: 'inactive-user', accountStatus: 'suspended' };
      },
    },
  });
  let inactiveUserError;
  await authenticateInactiveUser(createSocket('valid-token'), (error) => { inactiveUserError = error; });
  assert.match(inactiveUserError.message, /account is unavailable/);
});

test('authenticated sockets receive chat events in their private user room', async (context) => {
  const server = http.createServer();
  const io = createChatSocketServer(server, {
    clientOrigins: 'http://localhost:3000',
    jwtSecret: 'test-secret',
    tokenVerifier: (token) => (token === 'valid-token' ? 'active-user' : null),
    UserModel: {
      async findById() {
        return { _id: 'active-user', accountStatus: 'active' };
      },
    },
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const client = createClient(`http://127.0.0.1:${server.address().port}`, {
    auth: { token: 'valid-token' },
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
  });
  context.after(async () => {
    client.disconnect();
    await new Promise((resolve) => io.close(resolve));
  });

  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });

  const receivedEvent = new Promise((resolve) => {
    client.once('chat:new-message', resolve);
  });
  const event = {
    conversationId: 'conversation-id',
    message: { id: 'message-id', text: 'Hello in real time' },
  };
  io.to('user:active-user').emit('chat:new-message', event);

  assert.deepEqual(await receivedEvent, event);
});
