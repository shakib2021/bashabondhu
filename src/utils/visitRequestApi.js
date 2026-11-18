import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

function requireSession() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session;
}

export async function getMyVisitRequest(propertyId) {
  const session = getStoredUser();
  if (!session?.token) return null;

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/visit-requests/mine`, {
    token: session.token,
  });
  return result.visitRequest || null;
}

export async function createVisitRequest(propertyId, visitAt) {
  const session = requireSession();
  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/visit-requests`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ visitAt }),
  });
  return result.visitRequest;
}

export async function getOwnerVisitRequests() {
  const session = requireSession();
  const result = await requestApi('/owner/visit-requests', { token: session.token });
  if (!Array.isArray(result.visitRequests)) {
    throw new Error('The backend returned invalid visit requests.');
  }
  return result.visitRequests;
}

export async function updateVisitRequest(requestId, status) {
  const session = requireSession();
  const result = await requestApi(`/owner/visit-requests/${encodeURIComponent(requestId)}`, {
    method: 'PUT',
    token: session.token,
    body: JSON.stringify({ status }),
  });
  return result.visitRequest;
}
