import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, getIdToken, signOut } from 'firebase/auth';

const AuthContext = createContext(null);

// Inactivity timeout: 30 minutes (in milliseconds)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
// Token refresh interval: 50 minutes (tokens expire after 1 hour)
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userClaims, setUserClaims] = useState(null);
  const inactivityTimerRef = useRef(null);
  const tokenRefreshTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const activityListenersRef = useRef([]);

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
          type: claims.type,
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
      // Token expired or invalid - log out
      if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked' || error.code === 'auth/user-disabled') {
        console.log('Token expired, revoked, or user disabled. Logging out...');
        await signOut(auth);
      } else {
        // Other error - still log out to be safe
        console.log('Unexpected token error. Logging out for security...');
        await signOut(auth);
      }
      setToken(null);
      setUserClaims(null);
      return false;
    }
  };

  // Handle user activity
  const handleActivity = () => {
    lastActivityRef.current = Date.now();
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

    // Refresh token periodically
    tokenRefreshTimerRef.current = setInterval(async () => {
      if (currentUser) {
        console.log('Refreshing token...');
        await refreshTokenAndClaims(currentUser);
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
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('onAuthStateChanged fired:', currentUser ? 'user exists' : 'no user');
      
      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      
      setLoading(true); // Start loading
      
      // Safety timeout: if loading takes more than 10 seconds, force logout
      loadingTimeout = setTimeout(async () => {
        console.warn('Auth loading timeout - forcing logout');
        if (currentUser) {
          await signOut(auth);
        }
        setLoading(false);
      }, 10000);
      
      if (currentUser) {
        setUser(currentUser);
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
            
            // Set up inactivity timer
            setupInactivityTimer();
            
            // Set up periodic token refresh
            setupTokenRefresh(currentUser);
            setLoading(false); // Only set loading to false after claims are loaded
            console.log('Auth setup complete, loading set to false, userClaims should be available');
          } else {
            // Token refresh failed - user will be logged out
            // signOut will trigger onAuthStateChanged again with null
            clearInactivityTimer();
            clearTokenRefresh();
            // Don't set loading to false here - let the logout flow handle it
            console.log('Token refresh failed, waiting for logout...');
          }
        } catch (error) {
          console.error('Unexpected error in auth flow:', error);
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
          // Force logout on unexpected error
          await signOut(auth);
        }
      } else {
        // User logged out
        console.log('No user, clearing state...');
        setUser(null);
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
    refreshToken,
    signOut: handleSignOut,
    isRestaurantUser: userClaims?.type === 'restaurant',
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
        isRestaurantUser: userClaims?.type === 'restaurant',
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
