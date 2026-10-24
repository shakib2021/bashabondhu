const { applicationDefault, getApp, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

async function getVerifiedFirebaseUser(idToken) {
  if (typeof idToken !== 'string' || !idToken.trim()) {
    const error = new Error('A Firebase ID token is required.');
    error.status = 400;
    throw error;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase is not configured on the server.');
  }

  const firebaseApp = getApps().length > 0
    ? getApp()
    : initializeApp({
      credential: applicationDefault(),
      projectId,
    });

  let decodedToken;
  try {
    decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);
  } catch (verificationError) {
    if (![
      'auth/argument-error',
      'auth/invalid-id-token',
      'auth/id-token-expired',
      'auth/id-token-revoked',
    ].includes(verificationError.code)) {
      throw verificationError;
    }

    const error = new Error('Firebase could not verify this account. Sign in again.');
    error.status = 401;
    throw error;
  }

  if (!decodedToken.uid || !decodedToken.email) {
    const error = new Error('Firebase must provide a valid user ID and email address.');
    error.status = 401;
    throw error;
  }

  const email = decodedToken.email.trim().toLowerCase();
  return {
    uid: decodedToken.uid,
    email,
    fullName: typeof decodedToken.name === 'string' && decodedToken.name.trim()
      ? decodedToken.name.trim()
      : email.split('@')[0],
    emailVerified: decodedToken.email_verified === true,
  };
}

module.exports = { getVerifiedFirebaseUser };
