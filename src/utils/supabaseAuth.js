import { getSupabaseClient } from '../lib/supabase';

const PENDING_ACCOUNT_TYPE_KEY = 'bashabondhu.pendingAccountType';
const PENDING_RETURN_TO_KEY = 'bashabondhu.pendingReturnTo';

export function getSafeReturnTo(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return '/';
  }

  const destination = new URL(path, window.location.origin);
  if (
    destination.origin !== window.location.origin
    || ['/login', '/register', '/auth/callback'].includes(destination.pathname)
  ) {
    return '/';
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export async function startGoogleSignIn(accountType, returnTo = '/') {
  const supabase = getSupabaseClient();

  if (accountType) {
    sessionStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);
  } else {
    sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
  }
  sessionStorage.setItem(PENDING_RETURN_TO_KEY, getSafeReturnTo(returnTo));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
    sessionStorage.removeItem(PENDING_RETURN_TO_KEY);
    throw error;
  }
}

export function getPendingAccountType() {
  return sessionStorage.getItem(PENDING_ACCOUNT_TYPE_KEY);
}

export function clearPendingAccountType() {
  sessionStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
}

export function getPendingReturnTo() {
  return getSafeReturnTo(sessionStorage.getItem(PENDING_RETURN_TO_KEY));
}

export function clearPendingReturnTo() {
  sessionStorage.removeItem(PENDING_RETURN_TO_KEY);
}
