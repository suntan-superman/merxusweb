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
  
  // For local development, use emulator URL
  if (import.meta.env.DEV) {
    return `http://localhost:5001/${projectId}/us-central1/api`;
  }
  
  // For production, use deployed Cloud Functions URL
  return `https://us-central1-${projectId}.cloudfunctions.net/api`;
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
        const token = await getIdToken(user, true);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting token:', error);
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
    // Enhanced error logging in development
    if (import.meta.env.DEV) {
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
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
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

