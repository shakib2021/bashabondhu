import { getProfileRecord } from './supabaseProfile';

test('maps Supabase Google metadata to only the requested users columns', () => {
  const profile = getProfileRecord({
    id: 'auth-user-id',
    email: 'person@example.com',
    user_metadata: {
      full_name: 'Person Name',
      avatar_url: 'https://example.com/profile.png',
      role: 'admin',
    },
  });

  expect(profile).toEqual({
    email: 'person@example.com',
    fullName: 'Person Name',
    profileImage: 'https://example.com/profile.png',
  });
  expect(Object.keys(profile)).toEqual(['email', 'fullName', 'profileImage']);
});

test('falls back to the email name and a null image when Google omits optional metadata', () => {
  expect(getProfileRecord({
    email: 'person@example.com',
    user_metadata: {},
  })).toEqual({
    email: 'person@example.com',
    fullName: 'person',
    profileImage: null,
  });
});
