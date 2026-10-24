import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useGoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import { getSafeReturnTo } from '../../utils/authNavigation';
import {
  getFirebaseAuthErrorMessage,
  loginFirebaseUser,
  requestPasswordReset,
} from '../../utils/firebaseAuth';
import { loginGoogleUser } from '../../utils/googleOAuth';
import { getFirebaseAuth } from '../../firebase';
import './Login.css';

function Login() {
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = getSafeReturnTo(location.state?.from);

  const handleGoogleSuccess = async (tokenResponse) => {
    setAuthMessage('');
    setAuthError(false);
    setIsWorking(true);
    try {
      const user = await loginGoogleUser(tokenResponse.access_token);
      const dashboard = user.role === 'owner' ? '/owner' : user.role === 'admin' ? '/' : '/tenant/dashboard';
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

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setAuthMessage('');
    setAuthError(false);
    setIsWorking(true);

    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      if (!credential.user.emailVerified) {
        setAuthMessage('Please verify your email address before signing in. Check your inbox for the verification link.');
        setAuthError(true);
        return;
      }
      const user = await loginFirebaseUser(await credential.user.getIdToken());
      const dashboard = user.role === 'owner' ? '/owner' : user.role === 'admin' ? '/' : '/tenant/dashboard';
      navigate(returnTo === '/' ? dashboard : returnTo, { replace: true });
    } catch (error) {
      setAuthMessage(getFirebaseAuthErrorMessage(error, 'Could not sign in. Please try again.'));
      setAuthError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const openPasswordReset = () => {
    setResetEmail(email.trim());
    setAuthMessage('');
    setAuthError(false);
    setShowPasswordReset(true);
  };

  const returnToLogin = () => {
    setAuthMessage('');
    setAuthError(false);
    setShowPasswordReset(false);
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    const normalizedEmail = resetEmail.trim();
    setAuthMessage('');
    setAuthError(false);
    setIsResettingPassword(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setAuthMessage('If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.');
    } catch (error) {
      setAuthMessage(error.message || 'Could not send the password reset email. Please try again.');
      setAuthError(true);
    } finally {
      setIsResettingPassword(false);
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

        
        </div>

        <div className="auth-form-panel">
          <h2>{showPasswordReset ? 'Reset password' : 'Log in'}</h2>
          <p className="auth-subtitle">
            {showPasswordReset
              ? 'Enter your account email and we’ll send you a link to choose a new password.'
              : 'Sign in with your email and password or continue with Google.'}
          </p>
          {showPasswordReset ? (
            <form className="email-auth-form" onSubmit={handlePasswordReset}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  required
                  autoFocus
                />
              </label>
              <button className="email-auth-submit" type="submit" disabled={isResettingPassword}>
                {isResettingPassword ? 'Sending reset link…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="auth-link-button auth-back-link"
                onClick={returnToLogin}
                disabled={isResettingPassword}
              >
                Back to login
              </button>
            </form>
          ) : (
          <form className="email-auth-form" onSubmit={handleEmailSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <div className="auth-secondary-actions">
              <button
                type="button"
                className="auth-link-button"
                onClick={openPasswordReset}
                disabled={isWorking}
              >
                Forgot password?
              </button>
            </div>
            <button className="email-auth-submit" type="submit" disabled={isWorking}>
              {isWorking ? 'Signing in…' : 'Sign in with email'}
            </button>
          </form>
          )}
          {!showPasswordReset && <>
            <div className="auth-divider"><span>or</span></div>
            <GoogleAuthButton disabled={isWorking} onClick={handleGoogleAuth}>
              {isWorking ? 'Checking your account…' : 'Continue with Google'}
            </GoogleAuthButton>
          </>}
          {authMessage && (
            <p
              className={`auth-message${authError ? ' is-error' : ' is-success'}`}
              role={authError ? 'alert' : 'status'}
            >
              {authMessage}
            </p>
          )}

          {!showPasswordReset && (
            <p className="auth-switch">
              Don’t have an account? <Link to="/register" state={{ from: returnTo }}>Register</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
