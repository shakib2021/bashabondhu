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
