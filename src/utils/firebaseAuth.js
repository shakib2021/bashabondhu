import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';
import { saveUserProfile } from './authStorage';
import { requestApi } from './apiClient';

const ACCOUNT_ROLES = new Set(['tenant', 'owner', 'admin']);
const REGISTRATION_ROLES = new Set(['tenant', 'owner']);

export function getFirebaseAuthErrorMessage(error, fallbackMessage) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect. Please check your details and try again.',
    'auth/wrong-password': 'The email or password is incorrect. Please check your details and try again.',
    'auth/user-not-found': 'The email or password is incorrect. Please check your details and try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account is currently unavailable. Please contact support.',
    'auth/too-many-requests': 'There have been too many sign-in attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Could not connect to the sign-in service. Check your internet connection and try again.',
  };
  const message = messages[error?.code];

  if (message) {
    return message;
  }
  if (error?.code?.startsWith('auth/')) {
    return fallbackMessage;
  }
  return error?.message || fallbackMessage;
}

export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error('Enter the email address associated with your account.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address to receive a password reset link.');
  }

  try {
    await sendPasswordResetEmail(getFirebaseAuth(), normalizedEmail);
    return { success: true, email: normalizedEmail };
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return { success: true, email: normalizedEmail };
    }

    if (error?.code === 'auth/invalid-email') {
      throw new Error('Enter a valid email address to receive a password reset link.');
    }

    throw new Error(error?.message || 'Could not send a password reset email. Please try again.');
  }
}

export async function registerFirebaseUser(role, idToken, profile) {
  if (!REGISTRATION_ROLES.has(role)) {
    throw new Error('Choose tenant or owner before registering.');
  }

  const result = await requestApi('/auth/firebase/register', {
    method: 'POST',
    body: JSON.stringify({ idToken, role, fullName: profile.fullName }),
  });

  if (!result.user?.id || !result.user.email || result.user.role !== role || !result.token) {
    throw new Error('The backend returned an invalid registration response. Please try again.');
  }

  return saveUserProfile(
    { id: result.user.id, email: result.user.email },
    result.user,
    result.user.role,
    result.token,
  );
}

export async function loginFirebaseUser(idToken) {
  const result = await requestApi('/auth/firebase/login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

  if (!result.user?.id || !result.user.email || !ACCOUNT_ROLES.has(result.user.role) || !result.token) {
    throw new Error('The backend returned an invalid login response. Please try again.');
  }

  return saveUserProfile(
    { id: result.user.id, email: result.user.email },
    result.user,
    result.user.role,
    result.token,
  );
}
