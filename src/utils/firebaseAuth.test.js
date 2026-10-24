import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';
import {
  getFirebaseAuthErrorMessage,
  loginFirebaseUser,
  registerFirebaseUser,
  requestPasswordReset,
} from './firebaseAuth';
import { getStoredUser } from './authStorage';

jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../firebase', () => ({
  getFirebaseAuth: jest.fn(() => ({ mock: 'auth' })),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  getFirebaseAuth.mockReturnValue({ mock: 'auth' });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('registers a Firebase user profile with the backend and stores the app session', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-user-id',
        email: 'tenant@example.com',
        fullName: 'A Tenant',
        role: 'tenant',
      },
      token: 'signed-token',
    }),
  });

  await registerFirebaseUser('tenant', 'firebase-id-token', { fullName: 'A Tenant' });

  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/auth/firebase/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: 'firebase-id-token',
        role: 'tenant',
        fullName: 'A Tenant',
      }),
    },
  );
  expect(getStoredUser()).toMatchObject({
    id: 'mongo-user-id',
    email: 'tenant@example.com',
    role: 'tenant',
    token: 'signed-token',
  });
});

test('does not allow admin Firebase registration', async () => {
  global.fetch = jest.fn();

  await expect(registerFirebaseUser('admin', 'firebase-id-token', { fullName: 'Admin' }))
    .rejects.toThrow(/tenant or owner/i);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('logs in with Firebase and stores the saved app role', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-user-id',
        email: 'owner@example.com',
        fullName: 'Home Owner',
        role: 'owner',
      },
      token: 'signed-token',
    }),
  });

  await expect(loginFirebaseUser('firebase-id-token')).resolves.toMatchObject({
    id: 'mongo-user-id',
    email: 'owner@example.com',
    role: 'owner',
  });
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/auth/firebase/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'firebase-id-token' }),
    },
  );
});

test.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'])(
  'shows a clear message for Firebase credential error %s',
  (code) => {
    expect(getFirebaseAuthErrorMessage({ code, message: `Firebase: Error (${code}).` }, 'Try again.'))
      .toBe('The email or password is incorrect. Please check your details and try again.');
  },
);

test('does not expose unrecognized Firebase technical errors', () => {
  expect(getFirebaseAuthErrorMessage(
    { code: 'auth/some-new-error', message: 'Firebase: Error (auth/some-new-error).' },
    'Could not sign in. Please try again.',
  )).toBe('Could not sign in. Please try again.');
});

test('requests a Firebase password reset email', async () => {
  sendPasswordResetEmail.mockResolvedValue();

  await expect(requestPasswordReset('user@example.com')).resolves.toMatchObject({
    success: true,
    email: 'user@example.com',
  });

  expect(getFirebaseAuth).toHaveBeenCalledTimes(1);
  expect(sendPasswordResetEmail).toHaveBeenCalledWith({ mock: 'auth' }, 'user@example.com');
});

test('rejects invalid email formats before sending a reset request', async () => {
  await expect(requestPasswordReset('not-an-email')).rejects.toThrow(/valid email/i);
  expect(sendPasswordResetEmail).not.toHaveBeenCalled();
});

test('returns a generic reset result when Firebase reports an unknown email', async () => {
  sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

  await expect(requestPasswordReset('unknown@example.com')).resolves.toMatchObject({
    success: true,
    email: 'unknown@example.com',
  });
});

test('surfaces Firebase password reset delivery errors', async () => {
  sendPasswordResetEmail.mockRejectedValue(new Error('Firebase is unavailable.'));

  await expect(requestPasswordReset('user@example.com')).rejects.toThrow('Firebase is unavailable.');
});

test('surfaces Firebase profile registration errors', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, message: 'Email already registered.' }),
  });

  await expect(registerFirebaseUser('tenant', 'firebase-id-token', { fullName: 'A Tenant' }))
    .rejects.toThrow('Email already registered.');
});
