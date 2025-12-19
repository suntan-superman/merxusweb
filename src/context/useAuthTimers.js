/**
 * Inactivity timer hook - monitors user activity and handles auto-logout
 */
import { useRef, useCallback, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { INACTIVITY_TIMEOUT, ACTIVITY_EVENTS, ENABLE_INACTIVITY_TIMEOUT } from './authConstants';

/**
 * Hook to manage inactivity-based auto-logout
 * @param {boolean} isAuthenticated - Whether user is logged in
 * @returns {Object} Timer control functions
 */
export function useInactivityTimer(isAuthenticated) {
  const inactivityTimerRef = useRef(null);
  const activityListenersRef = useRef([]);
  const lastActivityRef = useRef(Date.now());

  // Handle user activity - reset inactivity timer
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Reset the inactivity timer on any activity
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(async () => {
        console.log('Inactivity timeout reached. Logging out...');
        await signOut(auth);
      }, INACTIVITY_TIMEOUT);
    }
  }, []);

  // Set up inactivity monitoring
  const setupTimer = useCallback(() => {
    if (!ENABLE_INACTIVITY_TIMEOUT) return;

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
      ACTIVITY_EVENTS.forEach((event) => {
        const handler = handleActivity;
        window.addEventListener(event, handler, { passive: true });
        activityListenersRef.current.push({ event, handler });
      });
    }
  }, [handleActivity]);

  // Clear inactivity monitoring
  const clearTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Remove activity listeners
    activityListenersRef.current.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    activityListenersRef.current = [];
  }, []);

  // Auto-manage timer based on auth state
  useEffect(() => {
    if (isAuthenticated && ENABLE_INACTIVITY_TIMEOUT) {
      setupTimer();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
    };
  }, [isAuthenticated, setupTimer, clearTimer]);

  return {
    setupTimer,
    clearTimer,
    lastActivity: lastActivityRef,
  };
}

/**
 * Hook to manage periodic token refresh
 * @param {Object} user - Firebase user
 * @param {Function} refreshFn - Function to refresh token
 * @param {number} interval - Refresh interval in ms
 * @returns {Object} Timer control functions
 */
export function useTokenRefreshTimer(user, refreshFn, interval) {
  const timerRef = useRef(null);

  const setupTimer = useCallback(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!user) return;

    // Refresh token periodically
    timerRef.current = setInterval(async () => {
      if (user && auth.currentUser) {
        console.log('Periodic token refresh triggered...');
        try {
          const success = await refreshFn();
          if (!success) {
            console.warn('Periodic token refresh failed, but keeping user logged in');
          }
        } catch (error) {
          console.error('Error in periodic token refresh:', error);
        }
      } else {
        console.log('No user for periodic refresh, clearing interval');
        clearTimer();
      }
    }, interval);
  }, [user, refreshFn, interval]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-manage timer based on user
  useEffect(() => {
    if (user) {
      setupTimer();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
    };
  }, [user, setupTimer, clearTimer]);

  return {
    setupTimer,
    clearTimer,
  };
}
