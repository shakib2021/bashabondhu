import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabase';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    let isMounted = true;
    let subscription;

    try {
      const supabase = getSupabaseClient();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setUser(session?.user || null);
          setAvatarFailed(false);
          setAuthLoaded(true);
        }
      });
      subscription = data.subscription;

      supabase.auth.getSession()
        .then(({ data: sessionData, error }) => {
          if (error) {
            throw error;
          }
          if (isMounted) {
            setUser(sessionData.session?.user || null);
            setAvatarFailed(false);
            setAuthLoaded(true);
          }
        })
        .catch(() => {
          if (isMounted) {
            setUser(null);
            setAuthLoaded(true);
          }
        });
    } catch {
      setAuthLoaded(true);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email
    || 'Your account';
  const initials = userName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <Link className="brand" to="/" onClick={closeMenu} aria-label="BashaBondhu home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M5 18.2 20 6l15 12.2v15.3a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 5 33.5V18.2Z" fill="currentColor" />
              <path d="M16 36V23h8v13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m2.5 18.5 17.5-14 17.5 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="brand-name">Basha<span>Bondhu</span></span>
        </Link>

        <button
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`nav-content${menuOpen ? ' is-open' : ''}`}
          id="primary-navigation"
        >
          <div className="nav-links">
            <Link className="nav-link active" to="/#home" onClick={closeMenu}>Home</Link>
            <Link className="nav-link" to="/#homes" onClick={closeMenu}>Find a home</Link>
            <Link className="nav-link" to="/#how-it-works" onClick={closeMenu}>How it works</Link>
            <Link className="nav-link" to="/#about" onClick={closeMenu}>About us</Link>
          </div>
          <div className="nav-actions">
            {authLoaded && (user ? (
              <Link className="nav-dashboard" to="/tenant/dashboard" onClick={closeMenu} aria-label="Open your dashboard">
                {avatarUrl && !avatarFailed ? (
                  <img
                    className="nav-avatar"
                    src={avatarUrl}
                    alt=""
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className="nav-avatar nav-avatar-fallback" aria-hidden="true">{initials}</span>
                )}
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link className="nav-login" to="/login" state={{ from: returnTo }} onClick={closeMenu}>Log in</Link>
                <Link className="button button-small" to="/register" state={{ from: returnTo }} onClick={closeMenu}>Register</Link>
              </>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;