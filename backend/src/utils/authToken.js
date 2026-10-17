const jwt = require('jsonwebtoken');

function signAuthToken(userId, secret) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' });
}

function verifyAuthToken(token, secret) {
  const payload = jwt.verify(token, secret);
  return payload.sub;
}

module.exports = { signAuthToken, verifyAuthToken };
