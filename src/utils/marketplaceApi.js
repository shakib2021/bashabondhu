import { getStoredUser } from './authStorage';
import { requestApi } from './apiClient';

const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

function normalizeItem(item) {
  if (!item || !Array.isArray(item.images)) return item;
  return {
    ...item,
    images: item.images.map((image) => (
      typeof image === 'string' && image.startsWith('/api/')
        ? `${API_ORIGIN}${image}`
        : image
    )),
  };
}

function getSession() {
  const session = getStoredUser();
  if (!session?.token) {
    throw new Error('Sign in to use the marketplace.');
  }
  return session;
}

export async function getMarketplaceItems(search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const result = await requestApi(`/marketplace/items${query}`);
  if (!Array.isArray(result.items)) {
    throw new Error('The backend returned an invalid marketplace list.');
  }
  return result.items.map(normalizeItem);
}

export async function getMarketplaceItem(itemId) {
  const result = await requestApi(`/marketplace/items/${encodeURIComponent(itemId)}`);
  if (!result.item) {
    throw new Error('The backend returned invalid item details.');
  }
  return normalizeItem(result.item);
}

export async function createMarketplaceComment(itemId, text) {
  const session = getSession();
  const result = await requestApi(`/marketplace/items/${encodeURIComponent(itemId)}/comments`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify({ text }),
  });
  return result.comment;
}

export async function createMarketplaceCommentReply(itemId, commentId, text) {
  const session = getSession();
  const result = await requestApi(
    `/marketplace/items/${encodeURIComponent(itemId)}/comments/${encodeURIComponent(commentId)}/replies`,
    {
      method: 'POST',
      token: session.token,
      body: JSON.stringify({ text }),
    },
  );
  return result.reply;
}

export async function createMarketplaceItem(item, imageFiles = []) {
  const session = getSession();
  const formData = new FormData();
  formData.append('item', JSON.stringify(item));
  imageFiles.forEach((file) => formData.append('images', file));
  const result = await requestApi('/marketplace/items', {
    method: 'POST',
    token: session.token,
    body: formData,
  });
  return normalizeItem(result.item);
}

export async function getMyMarketplaceItems() {
  const session = getSession();
  const result = await requestApi('/marketplace/my-items', { token: session.token });
  if (!Array.isArray(result.items)) {
    throw new Error('The backend returned an invalid marketplace list.');
  }
  return result.items.map(normalizeItem);
}

export async function getMyMarketplaceOffers() {
  const session = getSession();
  const result = await requestApi('/marketplace/my-offers', { token: session.token });
  if (!Array.isArray(result.offers)) {
    throw new Error('The backend returned an invalid offer list.');
  }
  return result.offers.map((entry) => ({ ...entry, item: normalizeItem(entry.item) }));
}

export async function createMarketplaceOffer(itemId, offer) {
  const session = getSession();
  const result = await requestApi(`/marketplace/items/${encodeURIComponent(itemId)}/offers`, {
    method: 'POST',
    token: session.token,
    body: JSON.stringify(offer),
  });
  return result.offer;
}

export async function respondToMarketplaceOffer(itemId, offerId, response) {
  const session = getSession();
  const result = await requestApi(
    `/marketplace/items/${encodeURIComponent(itemId)}/offers/${encodeURIComponent(offerId)}`,
    {
      method: 'PATCH',
      token: session.token,
      body: JSON.stringify(response),
    },
  );
  return result.offer;
}

export async function markMarketplaceItemSold(itemId) {
  const session = getSession();
  const result = await requestApi(`/marketplace/items/${encodeURIComponent(itemId)}/status`, {
    method: 'PATCH',
    token: session.token,
    body: JSON.stringify({ status: 'sold' }),
  });
  return normalizeItem(result.item);
}
