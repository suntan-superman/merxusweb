/**
 * AuthContext - Refactored version using extracted services
 * 
 * This context manages:
 * - Firebase authentication state
 * - JWT token and claims
 * - Inactivity-based auto-logout (configurable)
 * - Periodic token refresh
 * 
 * Components:
 * - tokenService.js: JWT decoding, refresh, claims extraction
 * - authConstants.js: Timeouts, feature flags, enums
 * - useAuthTimers.js: Inactivity and token refresh hooks
 * - authHelpers.js: Role checks, context value builders
 */
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Services
import { refreshTokenAndClaims, getTokenClaims } from './tokenService';
import { AUTH_LOADING_TIMEOUT, TOKEN_REFRESH_INTERVAL, ENABLE_INACTIVITY_TIMEOUT } from './authConstants';
import { useInactivityTimer, useTokenRefreshTimer } from './useAuthTimers';
import { buildAuthContextValue, buildDebugObject } from './authHelpers';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Core state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userClaims, setUserClaims] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  
  // Refs
  const userRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Token refresh function for hooks
  const handleRefreshToken = useCallback(async () => {
    if (!user) return null;
    
    const result = await refreshTokenAndClaims(user, { setToken, setUserClaims });
    if (result.success) {
      setNeedsOnboarding(false);
      return result.token;
    }
    if (result.needsOnboarding) {
      setNeedsOnboarding(true);
      return result.token || null;
    }
    return null;
  }, [user]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  // Inactivity timer (auto-manages based on auth state)
  const { clearTimer: clearInactivityTimer, setupTimer: setupInactivityTimer } = 
    useInactivityTimer(!!user && ENABLE_INACTIVITY_TIMEOUT);

  // Token refresh timer
  const { clearTimer: clearTokenRefresh, setupTimer: setupTokenRefresh } = 
    useTokenRefreshTimer(user, handleRefreshToken, TOKEN_REFRESH_INTERVAL);

  // Main auth state listener
  useEffect(() => {
    let loadingTimeout = null;
    let isUnmounting = false;
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('onAuthStateChanged fired:', currentUser ? 'user exists' : 'no user', {
        previousUser: user?.uid,
        currentUser: currentUser?.uid,
        timestamp: new Date().toISOString(),
      });
      
      if (isUnmounting) {
        console.log('Component unmounting, ignoring auth state change');
        return;
      }
      
      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      
      setLoading(true);
      
      // Safety timeout (if enabled)
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
        // Skip re-processing if already authenticated with same user
        if (user && user.uid === currentUser.uid && userClaims) {
          console.log('User already authenticated, skipping re-initialization');
          setLoading(false);
          return;
        }
        
        setUser(currentUser);
        userRef.current = currentUser;
        console.log('Setting user, refreshing token...');
        
        try {
          const result = await refreshTokenAndClaims(currentUser, { setToken, setUserClaims });
          if (result.needsOnboarding) {
            console.info('Token refresh result: onboarding pending (Apple user without custom claims yet).');
          } else {
            console.log('Token refresh result:', result.success);
          }
          
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
          
          if (result.success) {
            // Wait for state update to propagate
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (ENABLE_INACTIVITY_TIMEOUT) {
              setupInactivityTimer();
            }
            setupTokenRefresh();
            setNeedsOnboarding(false);
            setLoading(false);
            console.log('Auth setup complete');
          } else if (result.needsOnboarding) {
            console.warn('Apple user missing claims. Redirecting to onboarding wizard.');
            setNeedsOnboarding(true);
            setupTokenRefresh();
            setLoading(false);
          } else if (!result.critical) {
            // Non-critical failure - keep user logged in
            console.warn('Token refresh failed non-critically. User may experience issues.');
            setLoading(false);
            setupTokenRefresh(); // Try again later
          }
        } catch (error) {
          console.error('Unexpected error in auth flow:', error);
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
          
          if (error.code === 'auth/user-disabled' || error.code === 'auth/user-not-found') {
            console.error('Critical auth error, logging out:', error.code);
            await signOut(auth);
          } else {
            console.warn('Non-critical auth error, keeping user logged in');
            setLoading(false);
            if (userClaims) {
              setupTokenRefresh();
            }
          }
        }
      } else {
        // User logged out - check for false negative
        if (user && userClaims && Date.now() - lastActivityRef.current < 5000) {
          console.warn('Possible false logout detected. Waiting...');
          setTimeout(() => {
            if (!auth.currentUser && user) {
              console.log('User still not found, clearing state...');
              clearAuthState();
            } else if (auth.currentUser) {
              console.log('User recovered, ignoring false logout');
              setLoading(false);
            }
          }, 1000);
          return;
        }
        
        clearAuthState();
      }
    });

    const clearAuthState = () => {
      console.log('Clearing auth state...');
      setUser(null);
      userRef.current = null;
      setToken(null);
      setUserClaims(null);
      setNeedsOnboarding(false);
      clearInactivityTimer();
      clearTokenRefresh();
      setLoading(false);
      console.log('Logout complete');
    };

    return () => {
      isUnmounting = true;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      unsubscribe();
      clearInactivityTimer();
      clearTokenRefresh();
    };
  }, []); // Empty deps - only run on mount

  // Build context value
  const value = buildAuthContextValue({
    user,
    token,
    loading,
    userClaims,
    refreshToken: handleRefreshToken,
    signOut: handleSignOut,
    needsOnboarding,
  });

  // Debug object (dev only)
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      window.__MERXUS_AUTH_DEBUG__ = buildDebugObject(value, getTokenClaims);
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

// Re-export helpers for external use
export { TENANT_TYPES, USER_ROLES } from './authConstants';
export { hasAnyRole, hasTenantAccess, isAdminUser, getTenantTypeName, getRoleName } from './authHelpers';
