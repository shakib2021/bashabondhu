import {
  createMarketplaceItem,
  createMarketplaceComment,
  createMarketplaceOffer,
  createMarketplaceCommentReply,
  getMarketplaceItems,
} from './marketplaceApi';
import { saveUserProfile } from './authStorage';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
  saveUserProfile(
    { id: 'user-id', email: 'person@example.com' },
    { fullName: 'Marketplace User' },
    'tenant',
    'signed-token',
  );
});

test('publishes an item with uploaded photos for any signed-in role', async () => {
  const image = new File(['image'], 'chair.png', { type: 'image/png' });
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      item: { _id: 'item-id', images: ['/api/marketplace/images/item-id/photo-id'] },
    }),
  });

  const item = await createMarketplaceItem({
    title: 'Chair',
    price: 1000,
    condition: 'Good',
    location: 'Dhaka',
  }, [image]);

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:5000/api/marketplace/items',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(item.images[0]).toBe('http://localhost:5000/api/marketplace/images/item-id/photo-id');
});

test('searches public listings and submits offers with the signed-in session', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, items: [] }),
  });
  await getMarketplaceItems('study chair');
  expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:5000/api/marketplace/items?search=study%20chair',
    expect.any(Object),
  );

  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, offer: { amount: 900 } }),
  });
  await createMarketplaceOffer('item-id', { amount: 900 });
  expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:5000/api/marketplace/items/item-id/offers',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('posts marketplace comments and replies through separate comment endpoints', async () => {
  const fetchMock = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, comment: { _id: 'comment-id', text: 'Is pickup available?' } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, reply: { _id: 'reply-id', text: 'Yes, after 5pm.' } }),
    });

  await createMarketplaceComment('item-id', 'Is pickup available?');
  await createMarketplaceCommentReply('item-id', 'comment-id', 'Yes, after 5pm.');

  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    'http://localhost:5000/api/marketplace/items/item-id/comments',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    'http://localhost:5000/api/marketplace/items/item-id/comments/comment-id/replies',
    expect.objectContaining({ method: 'POST' }),
  );
});
