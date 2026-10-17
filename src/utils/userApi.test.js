import { saveUserProfile, getStoredUser } from './authStorage';
import { getUserInfo, updateUserInfo } from './userApi';

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.clear();
  saveUserProfile(
    { id: 'mongo-user-id', email: 'home@example.com' },
    { fullName: 'Home User', profileImage: '' },
    'tenant',
    'signed-token',
  );
});

afterEach(() => {
  global.fetch = originalFetch;
});

test.each(['tenant', 'owner', 'admin'])('loads a %s profile from the backend', async (role) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-user-id',
        fullName: 'Home User',
        email: 'home@example.com',
        profileImage: 'https://example.com/profile.png',
        phone: '123456789',
        address: 'Dhaka',
        occupation: 'Engineer',
        isVerified: true,
        role,
        authProvider: 'google',
      },
    }),
  });

  await expect(getUserInfo('home@example.com')).resolves.toEqual({
    id: 'mongo-user-id',
    fullName: 'Home User',
    email: 'home@example.com',
    profileImage: 'https://example.com/profile.png',
    phone: '123456789',
    address: 'Dhaka',
    occupation: 'Engineer',
    isVerified: true,
    role,
    authProvider: 'google',
  });
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/users/me',
    { headers: { Authorization: 'Bearer signed-token' } },
  );
});

test('updates the profile through the backend and refreshes the stored name and picture', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-user-id',
        fullName: 'Updated User',
        email: 'home@example.com',
        profileImage: '',
        phone: '123456789',
        address: 'Dhaka',
        occupation: 'Engineer',
        role: 'tenant',
        authProvider: 'google',
      },
    }),
  });

  await updateUserInfo({ fullName: 'Updated User', phone: '123456789' });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/users/me',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer signed-token',
      },
      body: JSON.stringify({ fullName: 'Updated User', phone: '123456789' }),
    },
  );
  expect(getStoredUser()).toMatchObject({ name: 'Updated User', token: 'signed-token' });
});

test('rejects an unsuccessful backend response with its message', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, message: 'User not found.' }),
  });

  await expect(getUserInfo('home@example.com')).rejects.toThrow('User not found.');
});

test('rejects an invalid role in a successful response', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, user: { id: 'mongo-user-id', role: 'unknown' } }),
  });

  await expect(getUserInfo('home@example.com')).rejects.toThrow(/invalid account/i);
});

test('requires a valid local session before calling the backend', async () => {
  global.fetch = jest.fn();
  await expect(getUserInfo('other@example.com')).rejects.toThrow(/session has expired/i);
  expect(global.fetch).not.toHaveBeenCalled();
});
