import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export function normalizePropertyImages(property) {
  if (!property || !Array.isArray(property.images)) return property;
  return {
    ...property,
    images: property.images.map((image) => (
      typeof image === 'string' && image.startsWith('/api/')
        ? `${API_ORIGIN}${image}`
        : image
    )),
  };
}

function normalizePropertyList(properties) {
  return properties.map(normalizePropertyImages);
}

export async function createProperty(property, imageFiles = []) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  let body = JSON.stringify(property);
  if (imageFiles.length > 0) {
    const formData = new FormData();
    formData.append('property', JSON.stringify(property));
    imageFiles.forEach((file) => formData.append('images', file));
    body = formData;
  }

  const result = await requestApi('/properties', {
    method: 'POST',
    token: session.token,
    body,
  });
  return normalizePropertyImages(result.property);
}

export async function updateProperty(propertyId, property, imageFiles = []) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const formData = new FormData();
  formData.append('property', JSON.stringify(property));
  imageFiles.forEach((file) => formData.append('images', file));

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}`, {
    method: 'PUT',
    token: session.token,
    body: formData,
  });
  return normalizePropertyImages(result.property);
}

export async function deleteProperty(propertyId) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  await requestApi(`/properties/${encodeURIComponent(propertyId)}`, {
    method: 'DELETE',
    token: session.token,
  });
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
  return normalizePropertyList(result.properties);
}

export async function getPublicProperties() {
  const result = await requestApi('/properties');
  if (!Array.isArray(result.properties)) {
    throw new Error('The backend returned an invalid property list. Please try again.');
  }
  return normalizePropertyList(result.properties);
}

export async function getPublicProperty(propertyId) {
  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}`);
  if (!result.property || !Array.isArray(result.property.comments)) {
    throw new Error('The backend returned invalid property details. Please try again.');
  }
  return normalizePropertyImages(result.property);
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