import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useNavigate } from 'react-router-dom';
import NotificationMenu from '../components/common/NotificationMenu';
import { clearUserProfile, getStoredUser } from '../utils/authStorage';
import { getUserInfo, updateUserInfo } from '../utils/userApi';
import '../owner/OwnerDashboard.css';
import './TenantDashboard.css';

function TenantDashboard() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: '',
    phone: '',
    address: '',
    occupation: '',
    profileImage: '',
  });
  const navigate = useNavigate();

  const loadProfile = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const user = getStoredUser();
      const email = user?.email;
      if (!email) {
        setStatus('signed-out');
        return;
      }

      const data = await getUserInfo(email);
      if (data.role !== 'tenant') {
        setStatus(data.role === 'owner' ? 'wrong-role-owner' : 'wrong-role');
        return;
      }

      setProfile(data);
      setFormValues({
        fullName: data.fullName || '',
        phone: data.phone || '',
        address: data.address || '',
        occupation: data.occupation || '',
        profileImage: data.profileImage || '',
      });
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error.message || 'Could not load your profile.');
      setStatus('error');
    }
  }, []);

  const beginEditing = () => {
    setFormValues({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      address: profile.address || '',
      occupation: profile.occupation || '',
      profileImage: profile.profileImage || '',
    });
    setFormMessage('');
    setFormError(false);
    setIsEditing(true);
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage('');
    setFormError(false);

    try {
      const fullName = formValues.fullName.trim();
      if (!fullName) {
        throw new Error('Enter your full name.');
      }

      const profileImage = formValues.profileImage.trim();
      if (profileImage) {
        let imageUrl;
        try {
          imageUrl = new URL(profileImage);
        } catch {
          throw new Error('Enter a valid profile image URL.');
        }
        if (!['https:', 'http:'].includes(imageUrl.protocol)) {
          throw new Error('Profile image URLs must use HTTP or HTTPS.');
        }
      }

      const updates = {
        fullName,
        phone: formValues.phone.trim() || null,
        address: formValues.address.trim() || null,
        occupation: formValues.occupation.trim() || null,
        profileImage: profileImage || null,
      };
      const data = await updateUserInfo(updates);

      setProfile(data);
      setFormValues({
        fullName: data.fullName || '',
        phone: data.phone || '',
        address: data.address || '',
        occupation: data.occupation || '',
        profileImage: data.profileImage || '',
      });
      setIsEditing(false);
      setFormMessage('Your profile has been updated.');
    } catch (error) {
      setFormMessage(error.message || 'Could not update your profile.');
      setFormError(true);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSignOut = () => {
    clearUserProfile();
    navigate('/login');
  };

  if (status === 'wrong-role' || status === 'wrong-role-owner') {
    return <Navigate to={status === 'wrong-role-owner' ? '/owner' : '/'} replace />;
  }

  const initials = profile?.fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const displayName = profile?.fullName || getStoredUser()?.name || 'My profile';

  return (
    <div className="owner-app tenant-app">
      <aside className="owner-sidebar">
        <Link className="owner-brand" to="/" aria-label="BashaBondhu home">
          <span className="owner-brand-mark" aria-hidden="true">B</span>
          <span>Basha<span className="owner-brand-accent">Bondhu</span></span>
        </Link>
        <div className="owner-sidebar-label">WORKSPACE</div>
        <nav className="owner-side-nav" aria-label="Tenant navigation">
          <NavLink end to="/tenant/dashboard" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">○</span>
            My profile
          </NavLink>
          <Link className="owner-side-link" to="/#homes">
            <span className="owner-nav-icon" aria-hidden="true">⌕</span>
            Browse homes
          </Link>
        </nav>
        <div className="owner-sidebar-bottom">
          <div className="owner-help-card">
            <span className="owner-help-icon" aria-hidden="true">?</span>
            <strong>Need a hand?</strong>
            <p>We’re here to help you find a place.</p>
            <Link to="/#contact">Contact our team <span aria-hidden="true">→</span></Link>
          </div>
          {status !== 'signed-out' && (
            <button className="owner-signout" type="button" onClick={handleSignOut}>
              <span aria-hidden="true">↗</span>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="owner-main">
        <header className="owner-topbar">
          <div className="owner-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>Tenant</strong></div>
          <div className="owner-topbar-actions">
            <NotificationMenu />
            <Link className="owner-account owner-profile-link" to="/tenant/dashboard#tenant-profile" aria-label="My profile">
              <span className="owner-account-copy">
                <strong>{displayName}</strong>
                <span>My profile</span>
              </span>
              {profile?.profileImage ? (
                <img className="owner-avatar" src={profile.profileImage} alt="" />
              ) : (
                <span className="owner-avatar owner-avatar-fallback" aria-hidden="true">{initials || 'T'}</span>
              )}
            </Link>
          </div>
        </header>

        <main className="owner-content tenant-dashboard-content">
          <section className="tenant-welcome" aria-labelledby="tenant-dashboard-title">
            <div>
              <span className="tenant-eyebrow">TENANT ACCOUNT</span>
              <h1 id="tenant-dashboard-title">Your profile</h1>
              <p>Manage the personal details connected to your BashaBondhu account.</p>
            </div>
            <span className="tenant-welcome-icon" aria-hidden="true">⌂</span>
          </section>

        {status === 'loading' && (
          <section className="tenant-profile-card tenant-feedback" aria-live="polite">
            <span className="tenant-loader" aria-hidden="true" />
            <p>Loading your profile…</p>
          </section>
        )}

        {status === 'ready' && profile && (
          <section className="tenant-profile-card" id="tenant-profile">
            <div className="tenant-profile-card-heading">
              <div>
                <span className="tenant-eyebrow">PERSONAL INFORMATION</span>
                <h2>Profile details</h2>
              </div>
              {isEditing ? (
                <span className="tenant-profile-badge">Editing profile</span>
              ) : (
                <button className="tenant-edit-button" type="button" onClick={beginEditing}>
                  Edit profile
                </button>
              )}
            </div>

            <div className="tenant-profile-summary">
              {formValues.profileImage ? (
                <img
                  className="tenant-avatar"
                  src={formValues.profileImage}
                  alt={`${formValues.fullName || 'Your'} profile`}
                />
              ) : (
                <div className="tenant-avatar tenant-avatar-fallback" aria-hidden="true">
                  {initials || 'U'}
                </div>
              )}
              <div className="tenant-profile-name">
                <h3>{isEditing ? formValues.fullName || 'Your name' : profile.fullName || 'Name not provided'}</h3>
                <p>{profile.email}</p>
              </div>
            </div>

            {isEditing ? (
              <form className="tenant-profile-form" onSubmit={handleProfileSubmit}>
                <div className="tenant-profile-fields">
                  <label className="tenant-profile-field">
                    <span>Full name</span>
                    <input
                      autoComplete="name"
                      name="fullName"
                      required
                      maxLength={120}
                      value={formValues.fullName}
                      onChange={handleProfileChange}
                    />
                  </label>
                  <label className="tenant-profile-field">
                    <span>Email address</span>
                    <input value={profile.email} readOnly />
                    <small>Email is managed by your Google sign-in.</small>
                  </label>
                  <label className="tenant-profile-field">
                    <span>Phone</span>
                    <input
                      autoComplete="tel"
                      name="phone"
                      type="tel"
                      maxLength={40}
                      value={formValues.phone}
                      onChange={handleProfileChange}
                    />
                  </label>
                  <label className="tenant-profile-field">
                    <span>Occupation</span>
                    <input
                      autoComplete="organization-title"
                      name="occupation"
                      maxLength={120}
                      value={formValues.occupation}
                      onChange={handleProfileChange}
                    />
                  </label>
                  <label className="tenant-profile-field tenant-profile-field-wide">
                    <span>Address</span>
                    <textarea
                      autoComplete="street-address"
                      name="address"
                      rows="3"
                      maxLength={500}
                      value={formValues.address}
                      onChange={handleProfileChange}
                    />
                  </label>
                  <label className="tenant-profile-field tenant-profile-field-wide">
                    <span>Profile image URL</span>
                    <input
                      name="profileImage"
                      type="url"
                      maxLength={2048}
                      placeholder="https://example.com/profile.jpg"
                      value={formValues.profileImage}
                      onChange={handleProfileChange}
                    />
                    <small>Use an image URL. File uploads are not configured yet.</small>
                  </label>
                </div>
                <div className="tenant-profile-form-actions">
                  <button
                    className="tenant-cancel-button"
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      setFormMessage('');
                      setFormError(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button className="tenant-primary-link" type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="tenant-profile-fields">
                  <div className="tenant-profile-field">
                    <span>Full name</span>
                    <strong>{profile.fullName || 'Not provided'}</strong>
                  </div>
                  <div className="tenant-profile-field">
                    <span>Email address</span>
                    <strong>{profile.email}</strong>
                  </div>
                  <div className="tenant-profile-field">
                    <span>Phone</span>
                    <strong>{profile.phone || 'Not provided'}</strong>
                  </div>
                  <div className="tenant-profile-field">
                    <span>Occupation</span>
                    <strong>{profile.occupation || 'Not provided'}</strong>
                  </div>
                  <div className="tenant-profile-field tenant-profile-field-wide">
                    <span>Address</span>
                    <strong>{profile.address || 'Not provided'}</strong>
                  </div>
                </div>
                <p className="tenant-profile-note">
                  Your profile details are loaded from your BashaBondhu account.
                </p>
              </>
            )}
            {formMessage && (
              <p className={formError ? 'tenant-form-message is-error' : 'tenant-form-message'} role={formError ? 'alert' : 'status'}>
                {formMessage}
              </p>
            )}
          </section>
        )}

        {status === 'signed-out' && (
          <section className="tenant-profile-card tenant-feedback">
            <h2>Sign in to view your profile</h2>
            <p>Your profile details are available after you sign in with Google.</p>
            <Link className="tenant-primary-link" to="/login" state={{ from: '/tenant/dashboard' }}>Go to login</Link>
          </section>
        )}

        {status === 'error' && (
          <section className="tenant-profile-card tenant-feedback" role="alert">
            <h2>We couldn’t load your profile</h2>
            <p>{errorMessage}</p>
            <button className="tenant-primary-link" type="button" onClick={loadProfile}>Try again</button>
          </section>
        )}
        </main>
        <footer className="tenant-dashboard-footer">
          <span>© {new Date().getFullYear()} BashaBondhu</span>
          <span>Find a place that feels like home.</span>
        </footer>
      </div>
    </div>
  );
}

export default TenantDashboard;
