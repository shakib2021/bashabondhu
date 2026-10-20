function serializeUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage || '',
    phone: user.phone || '',
    address: user.address || '',
    occupation: user.occupation || '',
    isVerified: user.isVerified === true,
    role: user.role,
    authProvider: user.authProvider,
  };
}

module.exports = { serializeUser };
