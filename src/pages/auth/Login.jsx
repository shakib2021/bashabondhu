import { useState } from 'react';
import { Link } from 'react-router-dom';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import './Login.css';

function Login() {
  const [authMessage, setAuthMessage] = useState('');

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-badge">Welcome back</div>
          <h1>Find your next home with confidence.</h1>
          <p>
            Sign in to save homes, track your favorites, and connect with trusted spaces
            that feel truly right for you.
          </p>

          <div className="auth-visual-card">
            <strong>Active listings</strong>
            <div className="stat">1,240+</div>
          </div>
        </div>

        <div className="auth-form-panel">
          <h2>Log in</h2>
          <p className="auth-subtitle">Use your Google account to securely sign in.</p>
          <GoogleAuthButton
            onClick={() => setAuthMessage('Google sign-in is not connected yet. Configure Google OAuth to enable login.')}
          >
            Continue with Google
          </GoogleAuthButton>
          {authMessage && <p className="auth-message" role="status">{authMessage}</p>}

          <p className="auth-switch">
            Don’t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
