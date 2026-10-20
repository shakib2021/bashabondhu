import { loginGoogleUser, registerGoogleUser } from './googleOAuth';
import { getStoredUser } from './authStorage';

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

test.each(['tenant', 'owner'])('registers the selected %s role with the backend', async (role) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-user-id',
        email: 'owner@example.com',
        fullName: 'Home Owner',
        profileImage: 'https://example.com/profile.png',
        role,
      },
      token: 'signed-token',
    }),
  });

  const user = await registerGoogleUser(role, 'google-access-token');

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/auth/google/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'google-access-token', role }),
    },
  );
  expect(user.role).toBe(role);
  expect(getStoredUser()).toMatchObject({
    id: 'mongo-user-id',
    email: 'owner@example.com',
    role,
    token: 'signed-token',
  });
});

test('does not allow admin registration', async () => {
  global.fetch = jest.fn();
  await expect(registerGoogleUser('admin', 'google-access-token'))
    .rejects.toThrow(/tenant or owner/i);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('shows the backend error when registration fails', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, message: 'Email already registered.' }),
  });

  await expect(registerGoogleUser('owner', 'google-access-token'))
    .rejects.toThrow('Email already registered.');
});

test('explains when the backend is unreachable or blocked by CORS', async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

  await expect(registerGoogleUser('owner', 'google-access-token'))
    .rejects.toThrow(/backend/i);
});

test('logs in with Google and stores the backend user and session token', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-user-id',
        fullName: 'Home Owner',
        email: 'owner@example.com',
        profileImage: 'https://example.com/profile.png',
        role: 'owner',
      },
      token: 'signed-token',
    }),
  });

  await expect(loginGoogleUser('google-access-token')).resolves.toMatchObject({
    id: 'mongo-user-id',
    role: 'owner',
    email: 'owner@example.com',
  });
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/auth/google/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'google-access-token' }),
    },
  );
  expect(getStoredUser()).toMatchObject({
    id: 'mongo-user-id',
    email: 'owner@example.com',
    role: 'owner',
    name: 'Home Owner',
    token: 'signed-token',
  });
});

test('shows the backend login error when the account cannot log in', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, message: 'Account not found. Register first.' }),
  });

  await expect(loginGoogleUser('google-access-token'))
    .rejects.toThrow('Account not found. Register first.');
});
