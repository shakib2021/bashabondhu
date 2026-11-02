import { createProperty } from './propertyApi';

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.setItem('bashabondhu.user', JSON.stringify({
    email: 'owner@example.com',
    role: 'owner',
    token: 'owner-token',
  }));
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      property: {
        _id: 'property-id',
        images: ['/api/property-images/property-id/photo-one', '/api/property-images/property-id/photo-two'],
      },
    }),
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.removeItem('bashabondhu.user');
});

test('sends property photos as multipart files and returns a usable image URL', async () => {
  const image = new File(['actual image bytes'], 'room.png', { type: 'image/png' });
  const secondImage = new File(['kitchen image bytes'], 'kitchen.png', { type: 'image/png' });
  const property = {
    title: 'Sunny room',
    images: [],
  };

  const savedProperty = await createProperty(property, [image, secondImage]);

  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe('http://localhost:5000/api/properties');
  expect(options.headers).toEqual({ Authorization: 'Bearer owner-token' });
  expect(options.body).toBeInstanceOf(FormData);
  expect(options.body.get('property')).toBe(JSON.stringify(property));
  expect(options.body.getAll('images')).toHaveLength(2);
  expect(options.body.get('images').name).toBe('room.png');
  expect(options.body.getAll('images')[1].name).toBe('kitchen.png');
  expect(savedProperty.images).toEqual([
    'http://localhost:5000/api/property-images/property-id/photo-one',
    'http://localhost:5000/api/property-images/property-id/photo-two',
  ]);
});
