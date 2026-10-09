import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import { getSafeReturnTo, startGoogleSignIn } from '../../utils/supabaseAuth';
import './Login.css';

function Login() {
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState(false);
  const location = useLocation();
  const returnTo = getSafeReturnTo(location.state?.from);

  const handleGoogleAuth = async () => {
    setAuthMessage('');
    setAuthError(false);
    try {
      await startGoogleSignIn(undefined, returnTo);
    } catch (error) {
      setAuthMessage(error.message);
      setAuthError(true);
    }
  };

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
          <p className="auth-subtitle">Continue with Google to load your profile on this device.</p>
          <GoogleAuthButton onClick={handleGoogleAuth}>
            Continue with Google
          </GoogleAuthButton>
          {authMessage && <p className="auth-message" role={authError ? 'alert' : 'status'}>{authMessage}</p>}

          <p className="auth-switch">
            Don’t have an account? <Link to="/register" state={{ from: returnTo }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
