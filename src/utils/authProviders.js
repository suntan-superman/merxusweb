import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../firebase/config';

const PROVIDER_LABELS = {
  'password': 'Email & Password',
  'apple.com': 'Apple Sign-In',
  'google.com': 'Google',
  'facebook.com': 'Facebook',
  'github.com': 'GitHub',
  'microsoft.com': 'Microsoft',
  'twitter.com': 'Twitter',
  'phone': 'Phone',
};

export async function getEmailSignInMethods(email) {
  if (!email || !email.trim()) {
    return [];
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email.trim());
    return Array.isArray(methods) ? methods : [];
  } catch (error) {
    console.error('[Auth] Failed to check sign-in methods:', error);
    return [];
  }
}

export function getSignInMethodInfo(methods = []) {
  const normalized = Array.isArray(methods) ? methods.filter(Boolean) : [];
  const hasPassword = normalized.includes('password');
  const nonPasswordProvider = normalized.find((method) => method !== 'password') || null;
  const providerLabel = nonPasswordProvider
    ? (PROVIDER_LABELS[nonPasswordProvider] || 'another provider')
    : null;

  return {
    methods: normalized,
    hasPassword,
    hasProvider: normalized.length > 0,
    providerId: nonPasswordProvider,
    providerLabel,
    isAppleOnly: !hasPassword && normalized.includes('apple.com'),
  };
}
