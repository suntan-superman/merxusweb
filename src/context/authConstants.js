/**
 * Authentication constants
 */

// Inactivity timeout: 1 hour (in milliseconds)
export const INACTIVITY_TIMEOUT = 60 * 60 * 1000;

// Token refresh interval: 50 minutes (tokens expire after 1 hour)
export const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000;

// Auth loading safety timeout: DISABLED FOR TESTING (was 30 seconds)
export const AUTH_LOADING_TIMEOUT = null;

// Feature flags
export const ENABLE_INACTIVITY_TIMEOUT = false; // Set to true to re-enable

// Activity events to track for inactivity detection
export const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
];

// Critical auth errors that should force logout
export const CRITICAL_AUTH_ERRORS = [
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/invalid-credential',
];

// Tenant types
export const TENANT_TYPES = {
  RESTAURANT: 'restaurant',
  VOICE: 'voice',
  REAL_ESTATE: 'real_estate',
  MERXUS: 'merxus',
};

// User roles
export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
  MERXUS_ADMIN: 'merxus_admin',
  MERXUS_SUPPORT: 'merxus_support',
};
