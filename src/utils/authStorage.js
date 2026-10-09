const USER_STORAGE_KEY = 'bashabondhu.user';

export function saveUserProfile(authUser, profile, accountType) {
  const previousUser = getStoredUser();
  const user = {
    id: authUser.id,
    email: authUser.email,
    name: profile.fullName,
    picture: profile.profileImage,
    ...(accountType
      ? { accountType }
      : previousUser?.id === authUser.id && previousUser.accountType
        ? { accountType: previousUser.accountType }
        : {}),
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return user;
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
