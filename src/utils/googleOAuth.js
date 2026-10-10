import { getSupabaseClient } from '../lib/supabase';
import { saveUserProfile } from './authStorage';

const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const ACCOUNT_ROLES = new Set(['tenant', 'owner', 'admin']);

export async function getGoogleProfile(accessToken) {
  if (!accessToken) {
    throw new Error('Google did not return an access token. Please try again.');
  }

  const response = await fetch(GOOGLE_USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Could not retrieve your Google profile. Please try again.');
  }

  const googleUser = await response.json();
  if (!googleUser.sub || !googleUser.email || googleUser.email_verified !== true) {
    throw new Error('Google must provide a verified email address to continue.');
  }

  return {
    id: googleUser.sub,
    email: googleUser.email.trim().toLowerCase(),
    fullName: googleUser.name || googleUser.email.split('@')[0],
    profileImage: googleUser.picture || null,
  };
}

export async function registerGoogleUser(googleProfile, role) {
  if (!ACCOUNT_ROLES.has(role)) {
    throw new Error('Choose a valid account type before registering.');
  }

  const supabase = getSupabaseClient();
  const { data: existingUser, error: lookupError } = await supabase
    .from('users')
    .select('email')
    .eq('email', googleProfile.email)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }
  if (existingUser) {
    throw new Error('An account with this Google email already exists. Please log in instead.');
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: googleProfile.email,
      fullName: googleProfile.fullName,
      profileImage: googleProfile.profileImage,
      role,
    })
    .select('email,fullName,profileImage,role')
    .single();

  if (error) {
    throw error;
  }
  if (!data || data.role !== role) {
    throw new Error('Your selected account type was not saved. Please try again.');
  }

  return saveUserProfile(
    { id: googleProfile.id, email: data.email },
    { fullName: data.fullName, profileImage: data.profileImage },
    data.role,
  );
}

export async function loginGoogleUser(googleProfile) {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('email,fullName,profileImage,role')
    .eq('email', googleProfile.email)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('No account exists for this Google email. Please register first.');
  }
  if (!ACCOUNT_ROLES.has(data.role)) {
    throw new Error('This account has an invalid role. Please contact support.');
  }

  return saveUserProfile(
    { id: googleProfile.id, email: data.email },
    { fullName: data.fullName, profileImage: data.profileImage },
    data.role,
  );
}
