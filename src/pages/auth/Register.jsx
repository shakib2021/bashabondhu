import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useGoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import { getSafeReturnTo } from '../../utils/authNavigation';
import { registerFirebaseUser } from '../../utils/firebaseAuth';
import { registerGoogleUser } from '../../utils/googleOAuth';
import { getFirebaseAuth } from '../../firebase';
import './Register.css';

function Register() {
  const [accountType, setAccountType] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
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
      await registerGoogleUser(accountType, tokenResponse.access_token);
      navigate(returnTo, { replace: true });
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

  const sendVerificationEmail = (user) => sendEmailVerification(user, {
    url: `${window.location.origin}/register`,
  });

  const completeFirebaseRegistration = async (user) => {
    const profile = await registerFirebaseUser(
      accountType,
      await user.getIdToken(true),
      { fullName: fullName.trim() },
    );
    navigate(returnTo === '/' ? (profile.role === 'owner' ? '/owner' : '/tenant/dashboard') : returnTo, {
      replace: true,
    });
  };

  const handleCheckVerification = async () => {
    setAuthMessage('');
    setAuthError(false);
    setIsWorking(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Sign in with the email address you registered, then check verification again.');
      }

      await reload(user);
      if (!user.emailVerified) {
        setAuthMessage('Your email is not verified yet. Open the verification link in your inbox, then try again.');
        return;
      }

      await completeFirebaseRegistration(user);
    } catch (error) {
      setAuthMessage(error.message || 'Could not verify your email. Please try again.');
      setAuthError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleResendVerification = async () => {
    setAuthMessage('');
    setAuthError(false);
    setIsWorking(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Sign in with the email address you registered before requesting another link.');
      }
      await sendVerificationEmail(user);
      setAuthMessage('A new verification link has been sent. Check your inbox and spam folder.');
    } catch (error) {
      setAuthMessage(error.message || 'Could not resend the verification email. Please try again.');
      setAuthError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setAuthMessage('');
    setAuthError(false);

    if (!accountType) {
      setAuthMessage('Choose an account type to continue.');
      setAuthError(true);
      return;
    }
    if (password !== confirmPassword) {
      setAuthMessage('Passwords do not match.');
      setAuthError(true);
      return;
    }

    setIsWorking(true);
    try {
      const auth = getFirebaseAuth();
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } catch (error) {
        if (error.code !== 'auth/email-already-in-use') {
          throw error;
        }
        credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      if (!credential.user.emailVerified) {
        setPendingVerification(true);
        await sendVerificationEmail(credential.user);
        setAuthMessage('We sent a verification link to your email. Verify your address, then select “I’ve verified my email”.');
        return;
      }

      await completeFirebaseRegistration(credential.user);
    } catch (error) {
      setAuthMessage(error.message || 'Could not create your account. Please try again.');
      setAuthError(true);
    } finally {
      setIsWorking(false);
    }
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
          <p className="auth-subtitle">Choose how you’ll use BashaBondhu, then create your account.</p>

          {!pendingVerification && <fieldset className="account-type-group">
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
          </fieldset>}

          {pendingVerification ? (
            <section className="email-verification" aria-labelledby="email-verification-title">
              <h3 id="email-verification-title">Verify your email</h3>
              <p>
                We sent a verification link to <strong>{email}</strong>. Click the link in that email,
                then come back here to finish creating your account.
              </p>
              <button
                className="email-auth-submit"
                type="button"
                onClick={handleCheckVerification}
                disabled={isWorking}
              >
                {isWorking ? 'Checking verification…' : 'I’ve verified my email'}
              </button>
              <button
                className="verification-resend"
                type="button"
                onClick={handleResendVerification}
                disabled={isWorking}
              >
                Resend verification email
              </button>
            </section>
          ) : <form className="email-auth-form" onSubmit={handleEmailSubmit}>
            <label className="auth-field">
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={255}
                required
              />
            </label>
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <button className="email-auth-submit" type="submit" disabled={!accountType || isWorking}>
              {isWorking ? 'Creating your account…' : 'Create account with email'}
            </button>
          </form>}
          {!pendingVerification && <>
            <div className="auth-divider"><span>or</span></div>
            <GoogleAuthButton disabled={!accountType || isWorking} onClick={handleGoogleAuth}>
              {isWorking ? 'Checking your Google account…' : 'Sign up with Google'}
            </GoogleAuthButton>
            {!accountType && <p className="account-type-hint">Choose an account type to continue.</p>}
          </>}
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
