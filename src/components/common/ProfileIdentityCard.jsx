function ProfileIdentityCard({ profile, roleLabel, statusLabel }) {
  const initials = profile.fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const completedDetails = [
    profile.fullName,
    profile.email,
    profile.phone,
    profile.occupation,
    profile.address,
  ].filter((value) => Boolean(value?.trim())).length;

  return (
    <section className="account-profile-hero" aria-label={`${roleLabel} profile summary`}>
      <div className="account-profile-cover" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="account-profile-hero-content">
        <div className="account-profile-avatar-wrap">
          {profile.profileImage ? (
            <img className="account-profile-avatar" src={profile.profileImage} alt={`${profile.fullName || 'Your'} profile`} />
          ) : (
            <div className="account-profile-avatar account-profile-avatar-fallback" aria-hidden="true">
              {initials || roleLabel[0]}
            </div>
          )}
          <span className="account-profile-avatar-dot" aria-hidden="true" />
        </div>
        <div className="account-profile-copy">
          <div className="account-profile-badges">
            <span className="account-profile-role">{roleLabel} account</span>
            {statusLabel && <span className="account-profile-status">{statusLabel}</span>}
          </div>
          <h2>{profile.fullName || 'Name not provided'}</h2>
          <p>{profile.email}</p>
        </div>
        <div className="account-profile-completion" aria-label={`${completedDetails} of 5 profile details added`}>
          <span>Profile details</span>
          <strong>{completedDetails}<small> / 5</small></strong>
          <div className="account-profile-progress" aria-hidden="true">
            <span style={{ width: `${(completedDetails / 5) * 100}%` }} />
          </div>
          <small>Keep your account up to date</small>
        </div>
      </div>
    </section>
  );
}

export default ProfileIdentityCard;
