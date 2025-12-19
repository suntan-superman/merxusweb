/**
 * Centralized Error Handler Utility
 * 
 * Provides consistent error handling across the application.
 * Extracts user-friendly messages from various error types and displays them.
 * 
 * @module utils/errorHandler
 */

import toast from 'react-hot-toast';

// ============================================================
// Error Message Mapping
// ============================================================

/**
 * Firebase Auth error codes to user-friendly messages
 */
const FIREBASE_AUTH_ERRORS = {
  'auth/email-already-in-use': 'This email is already registered. Please sign in or use a different email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email. Please sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/requires-recent-login': 'Please sign out and sign back in to complete this action.',
  'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
  'auth/invalid-login-credentials': 'Invalid email or password. Please try again.',
};

/**
 * Firestore error codes to user-friendly messages
 */
const FIRESTORE_ERRORS = {
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please wait a moment and try again.',
  'failed-precondition': 'Unable to complete this action. Please try again.',
  'aborted': 'Operation was aborted. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again later.',
  'data-loss': 'Data may have been lost. Please contact support.',
  'unauthenticated': 'Please sign in to continue.',
};

/**
 * HTTP status codes to user-friendly messages
 */
const HTTP_STATUS_ERRORS = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Please sign in to continue.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with existing data.',
  422: 'The provided data is invalid.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Service temporarily unavailable. Please try again.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'Request timed out. Please try again.',
};

// ============================================================
// Error Extraction Functions
// ============================================================

/**
 * Extract error message from various error types
 * @param {any} error - The error object
 * @returns {string} User-friendly error message
 */
function extractErrorMessage(error) {
  if (!error) {
    return 'An unexpected error occurred.';
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Firebase Auth error
  if (error.code && error.code.startsWith('auth/')) {
    return FIREBASE_AUTH_ERRORS[error.code] || error.message || 'Authentication failed.';
  }

  // Firestore error
  if (error.code && FIRESTORE_ERRORS[error.code]) {
    return FIRESTORE_ERRORS[error.code];
  }

  // Axios/Fetch API error with response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Try to get message from response body
    if (data?.error) {
      return typeof data.error === 'string' ? data.error : data.error.message || HTTP_STATUS_ERRORS[status];
    }
    if (data?.message) {
      return data.message;
    }
    
    return HTTP_STATUS_ERRORS[status] || `Request failed with status ${status}`;
  }

  // Network error (no response)
  if (error.request && !error.response) {
    return 'Network error. Please check your connection and try again.';
  }

  // HTTP status code directly on error
  if (error.status && HTTP_STATUS_ERRORS[error.status]) {
    return HTTP_STATUS_ERRORS[error.status];
  }

  // Error with message property
  if (error.message) {
    // Clean up technical messages
    if (error.message.includes('Firebase')) {
      return 'Service error. Please try again.';
    }
    if (error.message.includes('Network')) {
      return 'Network error. Please check your connection.';
    }
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

// ============================================================
// Main Error Handler Functions
// ============================================================

/**
 * Handle API error with toast notification
 * 
 * @param {any} error - The error object
 * @param {string} fallbackMessage - Fallback message if no specific message found
 * @returns {string} The error message that was displayed
 * 
 * @example
 * try {
 *   await api.updateSettings(data);
 * } catch (error) {
 *   handleApiError(error, 'Failed to update settings');
 * }
 */
export function handleApiError(error, fallbackMessage = 'Something went wrong') {
  const message = extractErrorMessage(error) || fallbackMessage;
  
  // Log for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', {
      message,
      originalError: error,
      stack: error?.stack,
    });
  } else {
    // In production, log less verbosely
    console.error('[API Error]', message);
  }
  
  toast.error(message);
  return message;
}

/**
 * Handle form submission error
 * Specialized for form validation and submission errors
 * 
 * @param {any} error - The error object
 * @param {string} context - Context of the form (e.g., 'saving settings', 'creating user')
 * @returns {string} The error message
 */
export function handleFormError(error, context = 'submitting form') {
  const message = extractErrorMessage(error);
  
  console.error(`[Form Error] While ${context}:`, error);
  toast.error(message);
  
  return message;
}

/**
 * Handle authentication error
 * Specialized for auth-related errors with more specific messages
 * 
 * @param {any} error - The error object
 * @returns {string} The error message
 */
export function handleAuthError(error) {
  const message = extractErrorMessage(error);
  
  console.error('[Auth Error]', error);
  toast.error(message);
  
  return message;
}

/**
 * Handle error silently (no toast, just log and return message)
 * Useful when you want to handle the error display yourself
 * 
 * @param {any} error - The error object
 * @param {string} context - Context for logging
 * @returns {string} The error message
 */
export function handleErrorSilent(error, context = 'Operation') {
  const message = extractErrorMessage(error);
  console.error(`[${context}]`, error);
  return message;
}

/**
 * Create an error handler with preset context
 * Useful for creating handlers for specific features/pages
 * 
 * @param {string} context - The context for error logging
 * @returns {Object} Object with error handling methods
 * 
 * @example
 * const errorHandler = createErrorHandler('VoiceSettings');
 * 
 * try {
 *   await saveSettings();
 * } catch (error) {
 *   errorHandler.handle(error);
 * }
 */
export function createErrorHandler(context) {
  return {
    handle: (error, fallback) => handleApiError(error, fallback || `Failed in ${context}`),
    handleSilent: (error) => handleErrorSilent(error, context),
    handleForm: (error) => handleFormError(error, context),
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if error is a network error
 * @param {any} error - The error object
 * @returns {boolean}
 */
export function isNetworkError(error) {
  return (
    error?.message?.includes('Network') ||
    error?.message?.includes('network') ||
    error?.code === 'ERR_NETWORK' ||
    (error?.request && !error?.response)
  );
}

/**
 * Check if error is an authentication error
 * @param {any} error - The error object
 * @returns {boolean}
 */
export function isAuthError(error) {
  return (
    error?.code?.startsWith('auth/') ||
    error?.response?.status === 401 ||
    error?.status === 401 ||
    error?.code === 'unauthenticated'
  );
}

/**
 * Check if error is a permission error
 * @param {any} error - The error object
 * @returns {boolean}
 */
export function isPermissionError(error) {
  return (
    error?.response?.status === 403 ||
    error?.status === 403 ||
    error?.code === 'permission-denied'
  );
}

/**
 * Check if error is a rate limit error
 * @param {any} error - The error object
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  return (
    error?.response?.status === 429 ||
    error?.status === 429 ||
    error?.code === 'resource-exhausted' ||
    error?.code === 'auth/too-many-requests'
  );
}

/**
 * Wrap an async function with error handling
 * 
 * @param {Function} fn - Async function to wrap
 * @param {string} errorMessage - Error message on failure
 * @returns {Function} Wrapped function
 * 
 * @example
 * const safeFetch = withErrorHandling(
 *   () => api.fetchData(),
 *   'Failed to fetch data'
 * );
 * const data = await safeFetch();
 */
export function withErrorHandling(fn, errorMessage) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, errorMessage);
      throw error; // Re-throw so caller knows it failed
    }
  };
}

// Default export for convenience
export default {
  handleApiError,
  handleFormError,
  handleAuthError,
  handleErrorSilent,
  createErrorHandler,
  isNetworkError,
  isAuthError,
  isPermissionError,
  isRateLimitError,
  withErrorHandling,
};
