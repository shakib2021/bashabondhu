function createAuthenticate(verifyToken, secret) {
  return (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Sign in to continue.' });
    }

    try {
      req.userId = verifyToken(token, secret);
      return next();
    } catch {
      return res.status(401).json({ success: false, message: 'Your session has expired. Sign in again.' });
    }
  };
}

module.exports = { createAuthenticate };
