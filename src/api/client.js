import axios from 'axios';
import { auth } from '../firebase/config';
import { getIdToken } from 'firebase/auth';

// Get the project ID from environment variable
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'merxus';

// Determine API base URL
const getApiBaseUrl = () => {
  // If explicitly set in environment, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Use Cloud Run backend (primary backend service)
  return `https://merxus-ai-backend-215800813926.us-central1.run.app/api`;
};

const baseURL = getApiBaseUrl();

// Log API configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:', {
    baseURL,
    projectId,
    env: import.meta.env.MODE,
  });
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        // Don't force refresh on every request - only refresh if token is about to expire
        // This prevents excessive token refreshes that might cause auth state issues
        const token = await getIdToken(user, false); // false = don't force refresh
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting token:', error);
        // If getting token fails, don't break the request - let the backend handle it
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Skip logging if explicitly suppressed (e.g., for expected 403/404 errors)
    const shouldSuppressLogging = error.config?.headers?.['X-Suppress-Error-Log'] === 'true';
    
    // Enhanced error logging in development
    if (import.meta.env.DEV && !shouldSuppressLogging) {
      console.error('❌ API Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    }

    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      // BUT: Don't redirect for public onboarding routes
      const currentPath = window.location.pathname;
      const isPublicRoute = error.config?.url?.includes('/onboarding/') || 
                           error.config?.url?.includes('/health');
      
      if (!currentPath.includes('/login') && !isPublicRoute) {
        window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
      }
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      // Connection refused - likely emulator not running
      console.error(
        '🚨 Cannot connect to API server.\n' +
        'Make sure Firebase emulators are running:\n' +
        '  firebase emulators:start\n\n' +
        'Or deploy Cloud Functions:\n' +
        '  firebase deploy --only functions\n\n' +
        `Expected URL: ${baseURL}`
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;

