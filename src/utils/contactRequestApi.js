import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

function requireSession() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session;
}

export async function getOwnerContactRequests() {
  const session = requireSession();
  const result = await requestApi('/owner/contact-requests', { token: session.token });
  if (!Array.isArray(result.contactRequests)) {
    throw new Error('The backend returned invalid contact requests.');
  }
  return result.contactRequests;
}

export async function updateContactRequest(requestId, status) {
  const session = requireSession();
  const result = await requestApi(`/owner/contact-requests/${encodeURIComponent(requestId)}`, {
    method: 'PUT',
    token: session.token,
    body: JSON.stringify({ status }),
  });
  return result.contactRequest;
}