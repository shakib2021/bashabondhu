const { Server } = require('socket.io');
const User = require('../models/User');
const { verifyAuthToken } = require('../utils/authToken');

function createSocketAuthenticator({ jwtSecret, tokenVerifier = verifyAuthToken, UserModel = User }) {
  return async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      next(new Error('Sign in to use chat.'));
      return;
    }

    let userId;
    try {
      userId = tokenVerifier(token, jwtSecret);
    } catch {
      next(new Error('Your session has expired. Sign in again.'));
      return;
    }

    try {
      const user = await UserModel.findById(userId);
      if (!user || user.accountStatus !== 'active') {
        next(new Error('Your account is unavailable.'));
        return;
      }
      socket.data.userId = String(user._id || userId);
      next();
    } catch (error) {
      console.error('Could not authenticate a chat socket:', error);
      next(new Error('Could not authenticate chat connection.'));
    }
  };
}

function createChatSocketServer(httpServer, {
  clientOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  jwtSecret = process.env.JWT_SECRET,
  tokenVerifier = verifyAuthToken,
  UserModel = User,
} = {}) {
  const allowedOrigins = new Set(
    clientOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
  );
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('This origin is not allowed by CORS.'));
      },
    },
  });

  io.use(createSocketAuthenticator({ jwtSecret, tokenVerifier, UserModel }));

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

module.exports = { createChatSocketServer, createSocketAuthenticator };
