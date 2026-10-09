export function getProfileRecord(user) {
  const metadata = user.user_metadata || {};
  const email = user.email;

  if (!email) {
    throw new Error('Google sign-in did not provide an email address.');
  }

  return {
    email,
    fullName: metadata.full_name || metadata.name || email.split('@')[0],
    profileImage: metadata.avatar_url || metadata.picture || null,
  };
}
