import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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
            <Link className="nav-login" to="/login" onClick={closeMenu}>Log in</Link>
            <Link className="button button-small" to="/register" onClick={closeMenu}>Register</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;