const USER_STORAGE_KEY = 'bashabondhu.user';

export function saveUserProfile(authUser, profile, accountType) {
  const previousUser = getStoredUser();
  const role = accountType || profile.role
    || (previousUser?.id === authUser.id ? previousUser.role || previousUser.accountType : null)
    || 'tenant';
  const user = {
    id: authUser.id,
    email: authUser.email,
    name: profile.fullName,
    picture: profile.profileImage,
    role,
    accountType: role,
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('bashabondhu:auth-change'));
  return user;
}

export function clearUserProfile() {
  localStorage.removeItem(USER_STORAGE_KEY);
  window.dispatchEvent(new Event('bashabondhu:auth-change'));
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}
