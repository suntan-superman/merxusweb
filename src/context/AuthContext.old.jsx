import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, getIdToken, signOut } from 'firebase/auth';

const AuthContext = createContext(null);

// Inactivity timeout: 1 hour (in milliseconds) - DISABLED FOR TESTING
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;
// Token refresh interval: 50 minutes (tokens expire after 1 hour)
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000;
// Auth loading safety timeout: DISABLED FOR TESTING (was 30 seconds)
const AUTH_LOADING_TIMEOUT = null; // Disabled
const ENABLE_INACTIVITY_TIMEOUT = false; // Set to true to re-enable

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userClaims, setUserClaims] = useState(null);
  const inactivityTimerRef = useRef(null);
  const tokenRefreshTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const activityListenersRef = useRef([]);
  const userRef = useRef(null);

  // Helper to decode JWT token
  const decodeToken = (idToken) => {
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
  };

  // Helper to refresh token and update claims
  const refreshTokenAndClaims = async (currentUser) => {
    try {
      console.log('Refreshing token and claims...');
      const idToken = await getIdToken(currentUser, true);
      
      const claims = decodeToken(idToken);
      console.log('Decoded claims:', claims);
      
      if (claims && (claims.role || claims.type)) {
        // Set both token and claims together
        setToken(idToken);
        const claimsObj = {
          role: claims.role,
          restaurantId: claims.restaurantId,
          officeId: claims.officeId,  // Support for voice/office tenants
          agentId: claims.agentId,  // NEW: Support for real estate agents
          type: claims.type,
          tenantType: claims.type,  // Alias for clarity
          tenantId: claims.restaurantId || claims.officeId || claims.agentId,  // Unified tenant ID
        };
        
        // Use a promise to ensure state is updated
        return new Promise((resolve) => {
          setUserClaims(claimsObj);
          console.log('Claims set successfully:', claimsObj);
          
          // Use requestAnimationFrame to ensure React has processed the state update
          // Then wait a bit more to ensure all components have re-rendered
          requestAnimationFrame(() => {
            setTimeout(() => {
              console.log('State update complete, claims should be available');
              resolve(true);
            }, 100);
          });
        });
      } else {
        // Token doesn't have required claims - user might have been disabled
        console.warn('Token missing required claims. Logging out...');
        await signOut(auth);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Only log out on critical auth errors, not network/timeout errors
      if (error.code === 'auth/id-token-expired' || 
          error.code === 'auth/id-token-revoked' || 
          error.code === 'auth/user-disabled' ||
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/invalid-credential') {
        console.log('Critical auth error. Logging out...', error.code);
        await signOut(auth);
        setToken(null);
        setUserClaims(null);
        return false;
      } else {
        // Network errors, timeouts, etc. - don't log out, just log the error
        console.warn('Non-critical token refresh error (network/timeout). Keeping user logged in:', error.code || error.message);
        // Try to get existing token from current user
        try {
          const existingToken = await getIdToken(currentUser, false); // Don't force refresh
          if (existingToken) {
            console.log('Using existing token despite refresh error');
            setToken(existingToken);
            // Try to decode existing token for claims
            const existingClaims = decodeToken(existingToken);
            if (existingClaims && (existingClaims.role || existingClaims.type)) {
              setUserClaims({
                role: existingClaims.role,
                restaurantId: existingClaims.restaurantId,
                officeId: existingClaims.officeId,  // NEW: Support for voice/office tenants
                type: existingClaims.type,
                tenantType: existingClaims.type,  // Alias for clarity
              });
            }
            return true;
          }
        } catch (tokenError) {
          console.warn('Could not get existing token:', tokenError);
        }
        // If we can't get a token at all, still don't log out - let the user try to continue
        console.warn('No token available, but keeping user logged in to allow retry');
        return false; // Return false but don't log out
      }
    }
  };

  // Handle user activity - reset inactivity timer
  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    // Reset the inactivity timer on any activity (if timer exists, user is logged in)
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(async () => {
        console.log('Inactivity timeout reached. Logging out...');
        await signOut(auth);
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Set up inactivity monitoring
  const setupInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set up new timer
    inactivityTimerRef.current = setTimeout(async () => {
      console.log('Inactivity timeout reached. Logging out...');
      await signOut(auth);
    }, INACTIVITY_TIMEOUT);

    // Track user activity - only add listeners once
    if (activityListenersRef.current.length === 0) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach((event) => {
        const handler = handleActivity;
        window.addEventListener(event, handler, { passive: true });
        activityListenersRef.current.push({ event, handler });
      });
    }
  };

  // Clear inactivity monitoring
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    // Remove activity listeners
    activityListenersRef.current.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    activityListenersRef.current = [];
  };

  // Set up periodic token refresh
  const setupTokenRefresh = (currentUser) => {
    // Clear existing timer
    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
    }

    // Refresh token periodically (only if user still exists)
    tokenRefreshTimerRef.current = setInterval(async () => {
      if (currentUser && auth.currentUser) {
        console.log('Periodic token refresh triggered...');
        try {
          const success = await refreshTokenAndClaims(currentUser);
          if (!success) {
            console.warn('Periodic token refresh failed, but keeping user logged in');
          }
        } catch (error) {
          console.error('Error in periodic token refresh:', error);
          // Don't log out on periodic refresh errors - just log them
        }
      } else {
        console.log('No user for periodic refresh, clearing interval');
        clearTokenRefresh();
      }
    }, TOKEN_REFRESH_INTERVAL);
  };

  // Clear token refresh timer
  const clearTokenRefresh = () => {
    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  };

  useEffect(() => {
    let loadingTimeout = null;
    let isUnmounting = false;
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('onAuthStateChanged fired:', currentUser ? 'user exists' : 'no user', {
        previousUser: user?.uid,
        currentUser: currentUser?.uid,
        timestamp: new Date().toISOString(),
      });
      
      // Prevent processing if component is unmounting
      if (isUnmounting) {
        console.log('Component unmounting, ignoring auth state change');
        return;
      }
      
      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      
      setLoading(true); // Start loading
      
      // Safety timeout: DISABLED FOR TESTING
      // Only set timeout if enabled and timeout value is provided
      if (AUTH_LOADING_TIMEOUT) {
        loadingTimeout = setTimeout(async () => {
          console.warn('Auth loading timeout - forcing logout');
          if (currentUser) {
            await signOut(auth);
          }
          setLoading(false);
        }, AUTH_LOADING_TIMEOUT);
      }
      
      if (currentUser) {
        // If we already have this user, don't re-process (prevents duplicate processing)
        if (user && user.uid === currentUser.uid && userClaims) {
          console.log('User already authenticated, skipping re-initialization');
          setLoading(false);
          return;
        }
        
        setUser(currentUser);
        userRef.current = currentUser;
        console.log('Setting user, refreshing token...');
        
        try {
          // Refresh token and get claims
          const success = await refreshTokenAndClaims(currentUser);
          console.log('Token refresh result:', success);
          
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
          
          if (success) {
            // Wait a bit more to ensure all components have re-rendered with new claims
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Set up inactivity timer (only if enabled)
            if (ENABLE_INACTIVITY_TIMEOUT) {
              setupInactivityTimer();
            }
            
            // Set up periodic token refresh
            setupTokenRefresh(currentUser);
            setLoading(false); // Only set loading to false after claims are loaded
            console.log('Auth setup complete, loading set to false, userClaims should be available');
          } else {
            // Token refresh failed but might be non-critical (network issue, etc.)
            // Check if we have existing claims - if so, keep user logged in
            if (userClaims) {
              console.warn('Token refresh failed but user has existing claims. Keeping logged in.');
              setLoading(false);
              // Still set up token refresh to retry later
              setupTokenRefresh(currentUser);
            } else {
              // No existing claims - this is a problem, but don't force logout immediately
              // Let the user stay logged in and try again on next interaction
              console.warn('Token refresh failed and no existing claims. User may experience issues but staying logged in.');
              setLoading(false);
              // Set up token refresh to retry
              setupTokenRefresh(currentUser);
            }
          }
        } catch (error) {
          console.error('Unexpected error in auth flow:', error);
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
          // Only force logout on truly critical errors
          if (error.code === 'auth/user-disabled' || error.code === 'auth/user-not-found') {
            console.error('Critical auth error, logging out:', error.code);
            await signOut(auth);
          } else {
            // Non-critical error - keep user logged in if they have existing claims
            console.warn('Non-critical auth error, keeping user logged in:', error.code || error.message);
            if (userClaims) {
              setLoading(false);
              setupTokenRefresh(currentUser);
            } else {
              // No claims, but don't force logout - let them try to use the app
              setLoading(false);
            }
          }
        }
      } else {
        // User logged out - but check if this is a false negative
        // Sometimes Firebase fires this during initialization
        if (user && userClaims && Date.now() - (lastActivityRef.current || 0) < 5000) {
          console.warn('Auth state changed to no user, but we had a valid session recently. This might be a false negative. Waiting...');
          // Don't clear state immediately - wait a moment to see if it recovers
          setTimeout(() => {
            if (!auth.currentUser && user) {
              console.log('User still not found after wait, clearing state...');
              setUser(null);
              userRef.current = null;
              setToken(null);
              setUserClaims(null);
              clearInactivityTimer();
              clearTokenRefresh();
              setLoading(false);
            } else if (auth.currentUser) {
              console.log('User recovered, ignoring false logout');
              setLoading(false);
            }
          }, 1000);
          return;
        }
        
        // User logged out
        console.log('No user, clearing state...');
        setUser(null);
        userRef.current = null;
        setToken(null);
        setUserClaims(null);
        
        // Clear timers
        clearInactivityTimer();
        clearTokenRefresh();
        setLoading(false); // Set loading to false when no user
        console.log('Logout complete, loading set to false');
      }
    });

    return () => {
      isUnmounting = true;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      unsubscribe();
      clearInactivityTimer();
      clearTokenRefresh();
    };
  }, []);

  const refreshToken = async () => {
    if (user) {
      const success = await refreshTokenAndClaims(user);
      if (success) {
        return token;
      }
      return null;
    }
    return null;
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Timers will be cleared by onAuthStateChanged
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    userClaims,
    restaurantId: userClaims?.restaurantId,  // Expose restaurantId directly for convenience
    officeId: userClaims?.officeId,  // Expose officeId for voice tenants
    agentId: userClaims?.agentId,  // NEW: Expose agentId for real estate agents
    tenantId: userClaims?.restaurantId || userClaims?.officeId || userClaims?.agentId,  // Unified tenant ID
    tenantType: userClaims?.type,  // 'restaurant' | 'voice' | 'real_estate' | 'merxus'
    refreshToken,
    signOut: handleSignOut,
    isRestaurantUser: userClaims?.type === 'restaurant',
    isVoiceUser: userClaims?.type === 'voice',  // Check if user is voice tenant
    isRealEstateUser: userClaims?.type === 'real_estate',  // NEW: Check if user is real estate agent
    isMerxusAdmin: userClaims?.type === 'merxus',
    isOwner: userClaims?.role === 'owner',
    isManager: userClaims?.role === 'manager',
    isStaff: userClaims?.role === 'staff',
    isMerxusAdminRole: userClaims?.role === 'merxus_admin',
    isMerxusSupport: userClaims?.role === 'merxus_support',
  };

  // Expose auth state to window for debugging (dev only)
  // Use useEffect to keep debug object updated
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      window.__MERXUS_AUTH_DEBUG__ = {
        user,
        token,
        loading,
        userClaims,
        restaurantId: userClaims?.restaurantId,
        officeId: userClaims?.officeId,
        agentId: userClaims?.agentId,  // NEW
        tenantId: userClaims?.restaurantId || userClaims?.officeId || userClaims?.agentId,
        tenantType: userClaims?.type,
        isRestaurantUser: userClaims?.type === 'restaurant',
        isVoiceUser: userClaims?.type === 'voice',
        isRealEstateUser: userClaims?.type === 'real_estate',  // NEW
        isMerxusAdmin: userClaims?.type === 'merxus',
        isOwner: userClaims?.role === 'owner',
        isManager: userClaims?.role === 'manager',
        isStaff: userClaims?.role === 'staff',
        isMerxusAdminRole: userClaims?.role === 'merxus_admin',
        isMerxusSupport: userClaims?.role === 'merxus_support',
        refreshToken: async () => {
          const result = await refreshToken();
          console.log('Manual token refresh result:', result);
          return result;
        },
        getTokenClaims: async () => {
          if (user) {
            try {
              const idToken = await getIdToken(user, true);
              const base64Url = idToken.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const claims = JSON.parse(jsonPayload);
              console.log('Current token claims:', claims);
              return claims;
            } catch (error) {
              console.error('Error getting token claims:', error);
              return null;
            }
          }
          return null;
        },
      };
    }
  }, [user, token, loading, userClaims]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
