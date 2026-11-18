import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

export async function reportProperty(propertyId, { category, details }) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to report a listing.');
  }

  const result = await requestApi(`/properties/${encodeURIComponent(propertyId)}/reports`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ category, details }),
  });
  if (!result.report) {
    throw new Error('The backend returned an invalid report confirmation.');
  }
  return result.report;
}

export async function reportContent({ targetType, targetId, propertyId, category, details }) {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to submit a report.');
  }

  let endpoint;
  if (targetType === 'property-comment') {
    endpoint = `/properties/${encodeURIComponent(propertyId)}/comments/${encodeURIComponent(targetId)}/reports`;
  } else if (targetType === 'marketplace-item') {
    endpoint = `/marketplace/items/${encodeURIComponent(targetId)}/reports`;
  } else if (targetType === 'user') {
    endpoint = `/users/${encodeURIComponent(targetId)}/reports`;
  } else {
    throw new Error('Choose a supported report target.');
  }

  const result = await requestApi(endpoint, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ category, details }),
  });
  if (!result.report) {
    throw new Error('The backend returned an invalid report confirmation.');
  }
  return result.report;
}
