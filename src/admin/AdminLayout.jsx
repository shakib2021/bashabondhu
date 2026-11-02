import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearUserProfile, getStoredUser } from '../utils/authStorage';
import { getUserInfo } from '../utils/userApi';
import '../owner/OwnerDashboard.css';
import './AdminDashboard.css';

function AdminLayout() {
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadAdmin = async () => {
      try {
        const storedUser = getStoredUser();
        if (!storedUser?.email) {
          if (isMounted) setStatus('signed-out');
          return;
        }

        const userProfile = await getUserInfo(storedUser.email);
        if (!userProfile || userProfile.role !== 'admin') {
          if (isMounted) {
            setProfile(userProfile);
            setStatus('not-admin');
          }
          return;
        }

        if (isMounted) {
          setProfile({
            fullName: userProfile.fullName || storedUser.name || storedUser.email,
            email: userProfile.email,
            profileImage: userProfile.profileImage || storedUser.picture || '',
          });
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load the admin dashboard.');
          setStatus('error');
        }
      }
    };

    loadAdmin();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = () => {
    clearUserProfile();
    navigate('/login');
  };

  if (status === 'loading') {
    return (
      <main className="owner-state-page" aria-live="polite">
        <span className="owner-loader" aria-hidden="true" />
        <p>Loading your admin workspace…</p>
      </main>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (status === 'not-admin') {
    const destination = profile?.role === 'owner' ? '/owner' : '/tenant/dashboard';
    return <Navigate to={destination} replace />;
  }

  if (status === 'error') {
    return (
      <main className="owner-state-page">
        <section className="owner-state-card" role="alert">
          <span className="owner-eyebrow">ADMIN WORKSPACE</span>
          <h1>We couldn’t load the admin dashboard</h1>
          <p>{errorMessage}</p>
          <button className="owner-button owner-button-primary" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  const initials = profile.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="owner-app">
      <aside className="owner-sidebar admin-sidebar">
        <Link className="owner-brand" to="/" aria-label="BashaBondhu home">
          <span className="owner-brand-mark" aria-hidden="true">⌂</span>
          <span>Basha<span className="owner-brand-accent">Bondhu</span></span>
        </Link>
        <div className="owner-sidebar-label">ADMIN WORKSPACE</div>
        <nav className="owner-side-nav" aria-label="Admin navigation">
          <NavLink end to="/admin" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">▦</span>
            Overview
          </NavLink>
          <NavLink to="/admin/verifications" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">✓</span>
            Pending verification
          </NavLink>
          <NavLink to="/admin/posts" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">▤</span>
            Posts
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">⚑</span>
            Reports
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">♙</span>
            Users
          </NavLink>
        </nav>
        <div className="owner-sidebar-bottom">
          <div className="admin-sidebar-note">
            <strong>Admin tools</strong>
            <p>Review listings, reports, accounts, and owner identities.</p>
          </div>
          <button className="owner-signout" type="button" onClick={handleSignOut}>
            <span aria-hidden="true">↗</span>
            Sign out
          </button>
        </div>
      </aside>
      <div className="owner-main">
        <header className="owner-topbar">
          <div className="owner-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>Admin</strong></div>
          <div className="owner-topbar-actions">
            <div className="owner-account">
              <span className="owner-account-copy">
                <strong>{profile.fullName}</strong>
                <span>Administrator</span>
              </span>
              {profile.profileImage ? (
                <img className="owner-avatar" src={profile.profileImage} alt="" />
              ) : (
                <span className="owner-avatar owner-avatar-fallback" aria-hidden="true">{initials || 'A'}</span>
              )}
            </div>
          </div>
        </header>
        <main className="owner-content admin-content">
          <Outlet context={{ profile }} />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
