/**
 * Token service - JWT decoding, refresh, and claims management
 */
import { getIdToken, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { CRITICAL_AUTH_ERRORS } from './authConstants';

/**
 * Decode a JWT token to extract claims
 * @param {string} idToken - The JWT token
 * @returns {Object|null} Decoded payload or null on error
 */
export function decodeToken(idToken) {
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Extract normalized claims object from decoded token
 * @param {Object} decodedClaims - Decoded JWT claims
 * @returns {Object} Normalized claims with role, tenant info
 */
export function extractUserClaims(decodedClaims) {
  if (!decodedClaims) return null;

  return {
    role: decodedClaims.role,
    restaurantId: decodedClaims.restaurantId,
    officeId: decodedClaims.officeId,
    agentId: decodedClaims.agentId,
    type: decodedClaims.type,
    tenantType: decodedClaims.type, // Alias for clarity
    tenantId: decodedClaims.restaurantId || decodedClaims.officeId || decodedClaims.agentId,
    invitedUser: decodedClaims.invitedUser === true,
    phoneVerified: decodedClaims.phoneVerified === true,
    emailVerified: decodedClaims.emailVerified === true,
    inviteStatus: decodedClaims.inviteStatus || null,
    disabled: decodedClaims.disabled === true,
  };
}

/**
 * Check if an error is a critical auth error requiring logout
 * @param {Error} error - The error to check
 * @returns {boolean} True if critical
 */
export function isCriticalAuthError(error) {
  return CRITICAL_AUTH_ERRORS.includes(error?.code);
}

/**
 * Refresh token and extract claims
 * @param {Object} currentUser - Firebase user object
 * @param {Object} options - Options
 * @param {Function} options.setToken - State setter for token
 * @param {Function} options.setUserClaims - State setter for claims
 * @returns {Promise<{success: boolean, token?: string, claims?: Object, needsOnboarding?: boolean, critical?: boolean}>}
 */
export async function refreshTokenAndClaims(currentUser, { setToken, setUserClaims }) {
  try {
    console.log('Refreshing token and claims...');
    const idToken = await getIdToken(currentUser, true);
    
    const decoded = decodeToken(idToken);
    console.log('Decoded claims:', decoded);
    
    if (decoded && (decoded.role || decoded.type)) {
      const claims = extractUserClaims(decoded);
      
      // Set both token and claims together
      setToken(idToken);
      
      return new Promise((resolve) => {
        setUserClaims(claims);
        console.log('Claims set successfully:', claims);
        
        // Wait for React to process state update
        requestAnimationFrame(() => {
          setTimeout(() => {
            console.log('State update complete, claims should be available');
            resolve({ success: true, token: idToken, claims });
          }, 100);
        });
      });
    } else {
      // Token missing claims – treat as onboarding needed for any provider
      console.warn('Token missing required claims. Marking as needs onboarding.');
      setToken(idToken);
      setUserClaims(null);
      return { success: false, needsOnboarding: true, critical: false, token: idToken };
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    // Only log out on critical auth errors
    if (isCriticalAuthError(error)) {
      console.log('Critical auth error. Logging out...', error.code);
      await signOut(auth);
      setToken(null);
      setUserClaims(null);
      return { success: false, critical: true };
    }
    
    // Network errors, timeouts, etc. - try to use existing token
    console.warn('Non-critical token refresh error:', error.code || error.message);
    
    try {
      const existingToken = await getIdToken(currentUser, false); // Don't force refresh
      if (existingToken) {
        console.log('Using existing token despite refresh error');
        setToken(existingToken);
        
        const existingClaims = decodeToken(existingToken);
        if (existingClaims && (existingClaims.role || existingClaims.type)) {
          const claims = extractUserClaims(existingClaims);
          setUserClaims(claims);
          return { success: true, token: existingToken, claims, fromCache: true };
        }
      }
    } catch (tokenError) {
      console.warn('Could not get existing token:', tokenError);
    }
    
    console.warn('No token available, but keeping user logged in to allow retry');
    return { success: false, critical: false };
  }
}

/**
 * Get fresh token claims (for debugging)
 * @param {Object} user - Firebase user
 * @returns {Promise<Object|null>} Token claims
 */
export async function getTokenClaims(user) {
  if (!user) return null;
  
  try {
    const idToken = await getIdToken(user, true);
    return decodeToken(idToken);
  } catch (error) {
    console.error('Error getting token claims:', error);
    return null;
  }
}
