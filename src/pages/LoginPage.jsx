import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userClaims, loading: authLoading } = useAuth();
  
  const invited = searchParams.get('fromInvite') === 'true';

  // Redirect if already logged in
  useEffect(() => {
    // Wait for auth to finish loading and user to be available
    if (!authLoading && user) {
      // Wait a moment for userClaims to load after login
      const timer = setTimeout(() => {
        if (userClaims) {
          // Determine redirect based on user type
          if (userClaims.type === 'merxus') {
            navigate('/merxus', { replace: true });
          } else if (userClaims.type === 'restaurant') {
            navigate('/restaurant', { replace: true });
          } else {
            // User doesn't have proper claims - show warning
            console.warn('User missing custom claims. Please ensure user has role and type set.');
            // Redirect to home as fallback
            navigate('/', { replace: true });
          }
        } else {
          // User is logged in but claims haven't loaded yet
          // Give it a bit more time, then redirect to restaurant as fallback
          console.warn('User logged in but custom claims not yet loaded. Redirecting to restaurant...');
          navigate('/restaurant', { replace: true });
        }
      }, 500); // Small delay to allow claims to load

      return () => clearTimeout(timer);
    }
  }, [user, userClaims, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Force token refresh to get latest claims
      await userCredential.user.getIdToken(true);
      // Navigation will be handled by useEffect once userClaims are loaded
    } catch (err) {
      console.error('Login error:', err);
      setError(getErrorMessage(err.code));
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(getErrorMessage(err.code));
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Show loading while checking auth state or redirecting
  if (authLoading || (user && !userClaims)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && userClaims) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-bold text-gray-900">
            Sign in to Merxus
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Restaurant Portal & Admin Dashboard
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {invited && (
            <div className="mb-4 rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-800">
              <p className="font-semibold mb-1">Welcome to Merxus!</p>
              <p>Your account has been set up. Please log in with your email and set your password using "Forgot Password" if needed.</p>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {resetEmailSent ? (
            <div className="text-center">
              <div className="mb-4 rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-700">
                Password reset email sent! Check your inbox.
              </div>
              <button
                onClick={() => {
                  setResetEmailSent(false);
                  setShowResetForm(false);
                }}
                className="text-primary-600 hover:text-primary-500 text-sm"
              >
                Back to login
              </button>
            </div>
          ) : showResetForm ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter your email"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    setError('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  Back to login
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(true);
                    setError('');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/onboarding" className="text-primary-600 hover:text-primary-500 font-medium">
              Get started
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

