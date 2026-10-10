import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import { clearUserProfile, getStoredUser } from '../utils/authStorage';
import './OwnerDashboard.css';

function OwnerLayout() {
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadOwner = async () => {
      try {
        const storedUser = getStoredUser();
        if (!storedUser?.email) {
          if (isMounted) setStatus('signed-out');
          return;
        }

        const { data: userProfile, error: profileError } = await getSupabaseClient()
          .from('users')
          .select('fullName,email,profileImage,role')
          .eq('email', storedUser.email)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!userProfile || userProfile.role !== 'owner') {
          if (isMounted) setStatus('not-owner');
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
          setErrorMessage(error.message || 'Could not load your owner dashboard.');
          setStatus('error');
        }
      }
    };

    loadOwner();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    clearUserProfile();
    navigate('/login');
  };

  if (status === 'loading') {
    return (
      <main className="owner-state-page" aria-live="polite">
        <span className="owner-loader" aria-hidden="true" />
        <p>Loading your owner workspace…</p>
      </main>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (status === 'not-owner') {
    return <Navigate to="/tenant/dashboard" replace />;
  }

  if (status === 'error') {
    return (
      <main className="owner-state-page">
        <section className="owner-state-card" role="alert">
          <span className="owner-eyebrow">OWNER WORKSPACE</span>
          <h1>We couldn’t load your dashboard</h1>
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
      <aside className="owner-sidebar">
        <Link className="owner-brand" to="/" aria-label="BashaBondhu home">
          <span className="owner-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M5 18.2 20 6l15 12.2v15.3a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 5 33.5V18.2Z" fill="currentColor" />
              <path d="M16 36V23h8v13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m2.5 18.5 17.5-14 17.5 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>Basha<span className="owner-brand-accent">Bondhu</span></span>
        </Link>

        <div className="owner-sidebar-label">WORKSPACE</div>
        <nav className="owner-side-nav" aria-label="Owner navigation">
          <NavLink end to="/owner" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">⌂</span>
            Overview
          </NavLink>
          <NavLink to="/owner/properties" className={({ isActive }) => `owner-side-link${isActive ? ' is-active' : ''}`}>
            <span className="owner-nav-icon" aria-hidden="true">▤</span>
            My properties
          </NavLink>
        </nav>

        <div className="owner-sidebar-bottom">
          <div className="owner-help-card">
            <span className="owner-help-icon" aria-hidden="true">?</span>
            <strong>Need a hand?</strong>
            <p>We’re here to help you get started.</p>
            <Link to="/#contact">Contact our team <span aria-hidden="true">→</span></Link>
          </div>
          <button className="owner-signout" type="button" onClick={handleSignOut}>
            <span aria-hidden="true">↗</span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="owner-main">
        <header className="owner-topbar">
          <div className="owner-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>Owner</strong></div>
          <div className="owner-account">
            <div className="owner-account-copy">
              <strong>{profile.fullName}</strong>
              <span>Property owner</span>
            </div>
            {profile.profileImage ? (
              <img className="owner-avatar" src={profile.profileImage} alt="" />
            ) : (
              <span className="owner-avatar owner-avatar-fallback" aria-label={profile.fullName}>{initials || 'O'}</span>
            )}
          </div>
        </header>

        <main className="owner-content">
          <Outlet context={{ profile }} />
        </main>
      </div>
    </div>
  );
}

export default OwnerLayout;
