import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import { getSafeReturnTo } from '../../utils/authNavigation';
import { getGoogleProfile, loginGoogleUser } from '../../utils/googleOAuth';
import './Login.css';

function Login() {
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = getSafeReturnTo(location.state?.from);

  const handleGoogleSuccess = async (tokenResponse) => {
    setAuthMessage('');
    setAuthError(false);
    setIsWorking(true);
    try {
      const googleProfile = await getGoogleProfile(tokenResponse.access_token);
      const user = await loginGoogleUser(googleProfile);
      const dashboard = user.role === 'owner' ? '/owner' : '/tenant/dashboard';
      navigate(returnTo === '/' ? dashboard : returnTo, { replace: true });
    } catch (error) {
      setAuthMessage(error.message || 'Could not sign in. Please try again.');
      setAuthError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const googleLogin = useGoogleLogin({
    scope: 'openid email profile',
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setAuthMessage('Google sign-in was cancelled or could not be completed. Please try again.');
      setAuthError(true);
    },
  });

  const handleGoogleAuth = () => {
    if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      setAuthMessage('Google OAuth is not configured. Set REACT_APP_GOOGLE_CLIENT_ID and restart the app.');
      setAuthError(true);
      return;
    }
    googleLogin();
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

        
        </div>

        <div className="auth-form-panel">
          <h2>Log in</h2>
          <p className="auth-subtitle">Continue with Google to load your profile on this device.</p>
          <GoogleAuthButton disabled={isWorking} onClick={handleGoogleAuth}>
            {isWorking ? 'Checking your account…' : 'Continue with Google'}
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
