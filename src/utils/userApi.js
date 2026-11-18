import { getStoredUser, updateStoredUserProfile } from './authStorage';
import { requestApi } from './apiClient';

const ACCOUNT_ROLES = new Set(['tenant', 'owner', 'admin']);
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export function normalizeProfileImageUrl(profileImage) {
  if (typeof profileImage === 'string' && profileImage.startsWith('/api/profile-images/')) {
    return `${API_ORIGIN}${profileImage}`;
  }
  return profileImage || '';
}

export async function getUserInfo(email) {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('A user email is required to load the profile.');
  }

  const session = getStoredUser();
  if (!session?.token || session.email?.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const result = await requestApi('/users/me', { token: session.token });
  return normalizeUser(result.user, email);
}

export async function updateUserInfo(updates) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const result = await requestApi('/users/me', {
    method: 'PUT',
    token: session.token,
    body: JSON.stringify(updates),
  });
  const profile = normalizeUser(result.user, session.email);
  updateStoredUserProfile(profile);
  return profile;
}

export async function uploadProfileImage(file) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (!file) {
    throw new Error('Choose a profile photo to upload.');
  }

  const formData = new FormData();
  formData.append('profileImage', file);
  const result = await requestApi('/users/me/profile-image', {
    method: 'POST',
    token: session.token,
    body: formData,
  });
  const profile = normalizeUser(result.user, session.email);
  updateStoredUserProfile(profile);
  return profile;
}

function normalizeUser(user, fallbackEmail) {
  if (!user || !user.id || !ACCOUNT_ROLES.has(user.role)) {
    throw new Error('The backend returned an invalid account. Please try again.');
  }

  return {
    id: user.id,
    fullName: user.fullName || '',
    email: user.email || fallbackEmail,
    profileImage: normalizeProfileImageUrl(user.profileImage),
    phone: user.phone || '',
    address: user.address || '',
    occupation: user.occupation || '',
    isVerified: user.isVerified === true,
    role: user.role,
    authProvider: user.authProvider || '',
  };
}
