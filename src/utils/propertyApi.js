import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

export async function createProperty(property) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const result = await requestApi('/properties', {
    method: 'POST',
    token: session.token,
    body: JSON.stringify(property),
  });
  return result.property;
}

export async function getMyProperties() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const result = await requestApi('/properties/mine', { token: session.token });
  if (!Array.isArray(result.properties)) {
    throw new Error('The backend returned an invalid property list. Please try again.');
  }
  return result.properties;
}

export async function getPublicProperties() {
  const result = await requestApi('/properties');
  if (!Array.isArray(result.properties)) {
    throw new Error('The backend returned an invalid property list. Please try again.');
  }
  return result.properties;
}

export async function getPublicProperty(propertyId) {
  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}`);
  if (!result.property || !Array.isArray(result.property.comments)) {
    throw new Error('The backend returned invalid property details. Please try again.');
  }
  return result.property;
}

export async function createPropertyComment(propertyId, text) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to leave a comment.');
  }

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/comments`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ text }),
  });
  return result.comment;
}

export async function createPropertyCommentReply(propertyId, commentId, text) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to reply to a comment.');
  }

  const result = await requestApi(
    `/properties/${encodeURIComponent(propertyId)}/comments/${encodeURIComponent(commentId)}/replies`,
    {
      method: 'POST',
      token: session.token,
      body: JSON.stringify({ text }),
    },
  );
  return result.reply;
}

export async function getMyContactRequest(propertyId) {
  const session = getStoredUser();
  if (!session?.token) {
    return null;
  }

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/contact-requests/mine`, {
    token: session.token,
  });
  return result.contactRequest || null;
}

export async function getOwnerContactDetails(propertyId) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to view owner contact details.');
  }

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/contact-details`, {
    token: session.token,
  });
  if (!result.owner) {
    throw new Error('The backend returned invalid owner contact details.');
  }
  return result.owner;
}

export async function createContactRequest(propertyId) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in as a tenant to request contact.');
  }

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/contact-requests`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({}),
  });
  return result.contactRequest;
}