import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

function getSessionToken() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session.token;
}

export async function getOwnerVerification() {
  const result = await requestApi('/owner/verification', { token: getSessionToken() });
  return result.verification;
}

export async function submitOwnerVerification({ nidName, nidNumber, frontImage, backImage }) {
  const formData = new FormData();
  formData.append('nidName', nidName);
  formData.append('nidNumber', nidNumber);
  formData.append('frontImage', frontImage);
  formData.append('backImage', backImage);
  const result = await requestApi('/owner/verification', {
    method: 'POST',
    token: getSessionToken(),
    body: formData,
  });
  return result.verification;
}

export async function getAdminOwnerVerifications() {
  const result = await requestApi('/admin/owner-verifications', { token: getSessionToken() });
  return result.verifications;
}

export async function getOwnerVerificationDocument(verificationId, side) {
  let response;
  try {
    response = await fetch(
      `${API_BASE_URL}/admin/owner-verifications/${encodeURIComponent(verificationId)}/documents/${side}`,
      { headers: { Authorization: `Bearer ${getSessionToken()}` } },
    );
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not reach the backend. Make sure it is running and CORS allows this frontend origin.');
    }
    throw error;
  }

  if (!response.ok) {
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('The backend returned an invalid response. Please try again.');
    }
    throw new Error(result.message || 'The NID image could not be loaded.');
  }
  return response.blob();
}

export async function reviewOwnerVerification(verificationId, decision, rejectionReason = '') {
  const result = await requestApi(`/admin/owner-verifications/${encodeURIComponent(verificationId)}`, {
    method: 'PATCH',
    token: getSessionToken(),
    body: JSON.stringify({ decision, rejectionReason }),
  });
  return result;
}
