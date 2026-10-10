const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockFrom = jest.fn();

jest.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

import { getGoogleProfile, loginGoogleUser, registerGoogleUser } from './googleOAuth';
import { getStoredUser } from './authStorage';

const originalFetch = global.fetch;

const googleProfile = {
  id: 'google-subject',
  email: 'owner@example.com',
  fullName: 'Home Owner',
  profileImage: 'https://example.com/profile.png',
};

beforeEach(() => {
  localStorage.clear();
  mockMaybeSingle.mockReset();
  mockSingle.mockReset();
  mockInsert.mockReset();
  mockFrom.mockReset();
  mockFrom.mockImplementation(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
    })),
    insert: (...args) => {
      mockInsert(...args);
      return {
        select: () => ({ single: mockSingle }),
      };
    },
  }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('loads and validates the Google user profile from its access token', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      sub: 'google-subject',
      email: 'owner@example.com',
      email_verified: true,
      name: 'Home Owner',
      picture: 'https://example.com/profile.png',
    }),
  });

  await expect(getGoogleProfile('google-access-token')).resolves.toEqual(googleProfile);
  expect(global.fetch).toHaveBeenCalledWith(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    { headers: { Authorization: 'Bearer google-access-token' } },
  );
});

test.each(['tenant', 'owner', 'admin'])('checks for an existing email and inserts the selected %s role', async (role) => {
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockSingle.mockResolvedValue({
    data: { ...googleProfile, role },
    error: null,
  });

  const user = await registerGoogleUser(googleProfile, role);

  expect(mockInsert).toHaveBeenCalledWith({
    email: googleProfile.email,
    fullName: googleProfile.fullName,
    profileImage: googleProfile.profileImage,
    role,
  });
  expect(user.role).toBe(role);
  expect(getStoredUser()).toMatchObject({
    id: googleProfile.id,
    email: googleProfile.email,
    role,
  });
});

test('rejects registration if a row already exists for the Google email', async () => {
  mockMaybeSingle.mockResolvedValue({
    data: { email: googleProfile.email },
    error: null,
  });

  await expect(registerGoogleUser(googleProfile, 'owner'))
    .rejects.toThrow(/already exists/i);
  expect(mockInsert).not.toHaveBeenCalled();
});

test('login only succeeds when the Google email already has a users row', async () => {
  mockMaybeSingle.mockResolvedValue({
    data: { ...googleProfile, role: 'tenant' },
    error: null,
  });

  await expect(loginGoogleUser(googleProfile)).resolves.toMatchObject({
    role: 'tenant',
    email: googleProfile.email,
  });

  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(loginGoogleUser(googleProfile)).rejects.toThrow(/register first/i);
});
