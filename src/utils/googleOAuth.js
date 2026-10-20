import { saveUserProfile } from './authStorage';
import { requestApi } from './apiClient';

const REGISTRATION_ROLES = new Set(['tenant', 'owner']);
const ACCOUNT_ROLES = new Set(['tenant', 'owner', 'admin']);

export async function registerGoogleUser(role, accessToken) {
  if (!REGISTRATION_ROLES.has(role)) {
    throw new Error('Choose tenant or owner before registering.');
  }

  const result = await requestApi('/auth/google/register', {
    method: 'POST',
    body: JSON.stringify({ accessToken, role }),
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

export async function loginGoogleUser(accessToken) {
  const result = await requestApi('/auth/google/login', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
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
