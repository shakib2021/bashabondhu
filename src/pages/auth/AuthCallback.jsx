import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabase';
import { saveUserProfile } from '../../utils/authStorage';
import { clearPendingAccountType, getPendingAccountType } from '../../utils/supabaseAuth';
import { getProfileRecord } from '../../utils/supabaseProfile';
import './Login.css';

function AuthCallback() {
  const [message, setMessage] = useState('Finishing Google sign-in…');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const completeSignIn = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session?.user) {
          throw new Error('No signed-in user was returned. Please try Google sign-in again.');
        }

        const user = data.session.user;
        const profile = getProfileRecord(user);
        const { error: saveError } = await supabase
          .from('users')
          .upsert(profile, { onConflict: 'email' });

        if (saveError) {
          throw saveError;
        }

        let cacheWarning = '';
        try {
          saveUserProfile(user, profile, getPendingAccountType());
          clearPendingAccountType();
        } catch (storageError) {
          cacheWarning = ` Supabase saved your profile, but local profile caching failed: ${storageError.message}`;
        }

        if (isMounted) {
          setMessage(`Signed in as ${profile.email}. Your profile is saved.${cacheWarning}`);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not finish sign-in. Please try again.');
        }
      }
    };

    completeSignIn();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasSignedIn = message.startsWith('Signed in as');

  return (
    <main className="auth-page">
      <section className="auth-form-panel">
        <h2>{errorMessage ? 'Sign-in needs attention' : 'Google sign-in'}</h2>
        <p className={errorMessage ? 'auth-message' : 'auth-subtitle'} role={errorMessage ? 'alert' : 'status'}>
          {errorMessage || message}
        </p>
        {(errorMessage || hasSignedIn) && (
          <p className="auth-switch">
            <Link to="/tenant/dashboard">View your profile</Link>
            {' · '}
            <Link to="/">Continue to BashaBondhu</Link>
          </p>
        )}
      </section>
    </main>
  );
}

export default AuthCallback;
