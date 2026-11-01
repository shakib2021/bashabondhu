import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

function getSessionToken() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to save homes to your watchlist.');
  }
  return session.token;
}

export async function getMyWatchlist() {
  const result = await requestApi('/users/me/watchlist', { token: getSessionToken() });
  if (!Array.isArray(result.properties)) {
    throw new Error('The backend returned an invalid watchlist. Please try again.');
  }
  return result.properties;
}

export async function setPropertyWatched(propertyId, watched) {
  const result = await requestApi(`/users/me/watchlist/${encodeURIComponent(propertyId)}`, {
    method: 'PUT',
    token: getSessionToken(),
    body: JSON.stringify({ watched }),
  });
  if (result.watched !== watched) {
    throw new Error('The backend could not update your watchlist. Please try again.');
  }
  return result.watched;
}
