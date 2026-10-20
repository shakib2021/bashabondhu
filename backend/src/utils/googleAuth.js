const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

async function getVerifiedGoogleUser(accessToken, googleClientId = process.env.GOOGLE_CLIENT_ID) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    const error = new Error('A Google access token is required.');
    error.status = 400;
    throw error;
  }

  if (!googleClientId) {
    throw new Error('Google OAuth is not configured on the server.');
  }

  const tokenInfoResponse = await fetch(
    `${GOOGLE_TOKEN_INFO_URL}?${new URLSearchParams({ access_token: accessToken })}`,
  );
  if (!tokenInfoResponse.ok) {
    const error = new Error('Google could not verify this account. Sign in with Google again.');
    error.status = 401;
    throw error;
  }

  const tokenInfo = await tokenInfoResponse.json();
  if (tokenInfo.aud !== googleClientId || tokenInfo.email_verified !== 'true') {
    const error = new Error('Google must provide a valid token and verified email address.');
    error.status = 401;
    throw error;
  }

  const response = await fetch(GOOGLE_USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const error = new Error('Google could not retrieve this account. Sign in with Google again.');
    error.status = 401;
    throw error;
  }

  const profile = await response.json();
  if (
    !profile.sub
    || profile.sub !== tokenInfo.sub
    || !profile.email
    || profile.email_verified !== true
    || profile.email.trim().toLowerCase() !== tokenInfo.email?.trim().toLowerCase()
  ) {
    const error = new Error('Google must provide a verified email address.');
    error.status = 401;
    throw error;
  }

  return {
    googleId: profile.sub,
    email: profile.email.trim().toLowerCase(),
    fullName: profile.name || profile.email.split('@')[0],
    profileImage: profile.picture || null,
  };
}

module.exports = { getVerifiedGoogleUser };
