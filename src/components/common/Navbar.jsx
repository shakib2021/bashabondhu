import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getStoredUser } from '../../utils/authStorage';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [avatarFailed, setAvatarFailed] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
      setAvatarFailed(false);
    };
    window.addEventListener('bashabondhu:auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('bashabondhu:auth-change', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const avatarUrl = user?.picture;
  const userName = user?.name
    || user?.email
    || 'Your account';
  const dashboardPath = user && (user.role || user.accountType) === 'owner'
    ? '/owner'
    : '/tenant/dashboard';
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
            {user ? (
              <Link className="nav-dashboard" to={dashboardPath} onClick={closeMenu} aria-label="Open your dashboard">
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
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;