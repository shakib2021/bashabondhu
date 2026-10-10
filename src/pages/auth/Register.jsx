import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import { getSafeReturnTo } from '../../utils/authNavigation';
import { getGoogleProfile, registerGoogleUser } from '../../utils/googleOAuth';
import './Register.css';

function Register() {
  const [accountType, setAccountType] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = getSafeReturnTo(location.state?.from);

  const selectAccountType = (event) => {
    setAccountType(event.target.value);
    setAuthMessage('');
    setAuthError(false);
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setAuthMessage('');
    setAuthError(false);
    setIsWorking(true);
    try {
      const googleProfile = await getGoogleProfile(tokenResponse.access_token);
      const user = await registerGoogleUser(googleProfile, accountType);
      const dashboard = user.role === 'owner' ? '/owner' : '/tenant/dashboard';
      navigate(returnTo === '/' ? dashboard : returnTo, { replace: true });
    } catch (error) {
      setAuthMessage(error.message || 'Could not create your account. Please try again.');
      setAuthError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const googleLogin = useGoogleLogin({
    scope: 'openid email profile',
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setAuthMessage('Google sign-up was cancelled or could not be completed. Please try again.');
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
          <div className="auth-badge">Join us</div>
          <h1>Start your home search with a trusted guide.</h1>
          <p>
            Create your account to shortlist homes, unlock local insights, and get matched with
            spaces that fit the way you really live.
          </p>

          <div className="auth-visual-card">
           
          </div>
        </div>

        <div className="auth-form-panel">
          <h2>Create account</h2>
          <p className="auth-subtitle">Choose how you’ll use BashaBondhu, then continue with Google.</p>

          <fieldset className="account-type-group">
            <legend>I’m joining as</legend>
            <label className={`account-type-option${accountType === 'tenant' ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="tenant"
                checked={accountType === 'tenant'}
                onChange={selectAccountType}
              />
              <span className="account-type-icon" aria-hidden="true">⌂</span>
              <span className="account-type-copy">
                <strong>Tenant</strong>
                <small>want to rent a home.</small>
              </span>
            </label>
            <label className={`account-type-option${accountType === 'owner' ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="owner"
                checked={accountType === 'owner'}
                onChange={selectAccountType}
              />
              <span className="account-type-icon" aria-hidden="true">⌂</span>
              <span className="account-type-copy">
                <strong>Owner</strong>
                <small>I want to list a house.</small>
              </span>
            </label>
            <label className={`account-type-option${accountType === 'admin' ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="admin"
                checked={accountType === 'admin'}
                onChange={selectAccountType}
              />
              <span className="account-type-icon" aria-hidden="true">⚙</span>
              <span className="account-type-copy">
                <strong>Admin</strong>
                <small>I manage homes and listings.</small>
              </span>
            </label>
          </fieldset>

          <GoogleAuthButton
            disabled={!accountType || isWorking}
            onClick={handleGoogleAuth}
          >
            {isWorking ? 'Checking your Google account…' : 'Sign up with Google'}
          </GoogleAuthButton>
          {!accountType && <p className="account-type-hint">Choose an account type to continue.</p>}
          {authMessage && <p className="auth-message" role={authError ? 'alert' : 'status'}>{authMessage}</p>}

          <p className="auth-switch">
            Already have an account? <Link to="/login" state={{ from: returnTo }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
