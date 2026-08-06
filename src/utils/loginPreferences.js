const REMEMBERED_EMAIL_KEY = 'merxus_login_remembered_email';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getRememberedLoginEmail() {
  try {
    return getStorage()?.getItem(REMEMBERED_EMAIL_KEY)?.trim().toLowerCase() || '';
  } catch {
    return '';
  }
}

export function saveRememberedLoginEmail(email) {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (normalizedEmail) {
      getStorage()?.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
    }
  } catch {
    // Browser privacy settings can block local storage. Sign-in still works normally.
  }
}

export function clearRememberedLoginEmail() {
  try {
    getStorage()?.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Browser privacy settings can block local storage. There is nothing else to clear.
  }
}
