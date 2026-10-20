const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { getVerifiedGoogleUser } = require('../src/utils/googleAuth');

const originalFetch = global.fetch;
const originalClientId = process.env.GOOGLE_CLIENT_ID;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
});

test('verifies the Google token audience and returns its verified profile', async () => {
  process.env.GOOGLE_CLIENT_ID = 'web-client-id';
  global.fetch = async (url, options) => {
    if (String(url).startsWith('https://oauth2.googleapis.com/tokeninfo')) {
      return {
        ok: true,
        json: async () => ({
          aud: 'web-client-id',
          sub: 'google-user-id',
          email: 'USER@example.com',
          email_verified: 'true',
        }),
      };
    }
    assert.equal(String(url), 'https://www.googleapis.com/oauth2/v3/userinfo');
    assert.equal(options.headers.Authorization, 'Bearer valid-access-token');
    return {
      ok: true,
      json: async () => ({
        sub: 'google-user-id',
        email: 'user@example.com',
        email_verified: true,
        name: 'Verified User',
        picture: 'https://example.com/avatar.png',
      }),
    };
  };

  await assert.doesNotReject(async () => {
    const profile = await getVerifiedGoogleUser('valid-access-token');
    assert.deepEqual(profile, {
      googleId: 'google-user-id',
      email: 'user@example.com',
      fullName: 'Verified User',
      profileImage: 'https://example.com/avatar.png',
    });
  });
});

test('rejects a token issued to another Google client', async () => {
  process.env.GOOGLE_CLIENT_ID = 'web-client-id';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      aud: 'different-client-id',
      email: 'user@example.com',
      email_verified: 'true',
    }),
  });

  await assert.rejects(
    getVerifiedGoogleUser('foreign-access-token'),
    { status: 401 },
  );
});

test('requires a non-empty access token', async () => {
  await assert.rejects(
    getVerifiedGoogleUser(''),
    { status: 400 },
  );
});
