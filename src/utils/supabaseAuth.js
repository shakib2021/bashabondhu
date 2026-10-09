import { getSupabaseClient } from '../lib/supabase';

const PENDING_ACCOUNT_TYPE_KEY = 'bashabondhu.pendingAccountType';

export async function startGoogleSignIn(accountType) {
  const supabase = getSupabaseClient();

  if (accountType) {
    sessionStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);
  } else {
    sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
    throw error;
  }
}

export function getPendingAccountType() {
  return sessionStorage.getItem(PENDING_ACCOUNT_TYPE_KEY);
}

export function clearPendingAccountType() {
  sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
}
