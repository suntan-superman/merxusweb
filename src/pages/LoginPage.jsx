import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { resendInvitationEmail } from '../api/voice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSetupEmail, setPasswordSetupEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendEmailMessage, setResendEmailMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userClaims, loading: authLoading } = useAuth();
  
  const invited = searchParams.get('fromInvite') === 'true';
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const officeId = searchParams.get('officeId');
  const restaurantId = searchParams.get('restaurantId');
  const agentId = searchParams.get('agentId');
  
  // Check if this is a password reset link from invitation
  useEffect(() => {
    if (oobCode && mode === 'resetPassword') {
      // Verify the code and get the email
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setPasswordSetupEmail(email);
          setShowPasswordSetup(true);
          setEmail(email); // Pre-fill email
        })
        .catch((err) => {
          console.error('Error verifying password reset code:', err);
          setError('Invalid or expired password reset link. Please request a new one.');
        });
    }
  }, [oobCode, mode]);

  // Redirect if already logged in
  useEffect(() => {
    // Wait for auth to finish loading and user to be available
    if (!authLoading && user) {
      // Wait a moment for userClaims to load after login
      const timer = setTimeout(() => {
        if (userClaims) {
          // Determine redirect based on user type
          if (userClaims.type === 'merxus') {
            // Super-admins get a tenant selector, regular admins go to restaurant portal
            if (userClaims.role === 'super_admin') {
              navigate('/merxus/select-tenant', { replace: true });
            } else {
            navigate('/merxus', { replace: true });
            }
          } else if (userClaims.type === 'voice') {
            navigate('/voice', { replace: true });
          } else if (userClaims.type === 'real_estate') {
            navigate('/estate', { replace: true });
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
          // Give it a bit more time, then redirect based on URL params or home
          const redirectPath = agentId ? '/estate' : officeId ? '/voice' : restaurantId ? '/restaurant' : '/';
          console.warn('User logged in but custom claims not yet loaded. Redirecting to:', redirectPath);
          navigate(redirectPath, { replace: true });
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

  const handleResendInvitationEmail = async () => {
    if (!prefillEmail) {
      setError('Email address is required to resend invitation');
      return;
    }

    setResendingEmail(true);
    setResendEmailMessage(null);
    setError('');

    try {
      const result = await resendInvitationEmail(prefillEmail);
      setResendEmailMessage({
        type: 'success',
        text: result.message || 'Invitation email has been resent successfully',
        link: result.invitationLink,
      });
      
      // If SendGrid didn't work, try Firebase Auth as backup
      if (!result.emailSent) {
        try {
          await sendPasswordResetEmail(auth, prefillEmail, {
            url: `${window.location.origin}/login?mode=resetPassword${agentId ? `&agentId=${agentId}` : ''}${officeId ? `&officeId=${officeId}` : ''}${restaurantId ? `&restaurantId=${restaurantId}` : ''}`,
            handleCodeInApp: false,
          });
          setResendEmailMessage({
            type: 'success',
            text: 'Invitation email has been resent via Firebase Auth',
            link: result.invitationLink,
          });
        } catch (firebaseError) {
          console.log('Firebase Auth backup also failed:', firebaseError);
        }
      }
    } catch (err) {
      console.error('Error resending invitation email:', err);
      setResendEmailMessage({
        type: 'error',
        text: err.message || 'Failed to resend invitation email. Please try again.',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!oobCode) {
      setError('Invalid password reset link');
      return;
    }

    setLoading(true);

    try {
      // Confirm password reset with the code
      await confirmPasswordReset(auth, oobCode, newPassword);
      
      // Password set successfully - now sign them in
      await signInWithEmailAndPassword(auth, passwordSetupEmail, newPassword);
      
      // Force token refresh to get latest claims
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.getIdToken(true);
      }
      
      // Navigation will be handled by useEffect once userClaims are loaded
    } catch (err) {
      console.error('Password setup error:', err);
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

  // Get success message from navigation state
  const locationState = location.state;
  const successMessage = locationState?.message;
  const prefillEmail = locationState?.email || passwordSetupEmail;
  const invitationLink = locationState?.invitationLink;

  // Pre-fill email if provided (must be before early returns per Rules of Hooks)
  useEffect(() => {
    if (prefillEmail && !email && !showPasswordSetup) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail, email, showPasswordSetup]);

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
            Sign in to access your portal
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {successMessage && !showPasswordSetup && (
            <div className="mb-6 rounded-md bg-green-50 border-2 border-green-300 px-6 py-4 text-sm text-green-800">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-semibold text-base mb-2">Account Created Successfully!</p>
                  <p className="mb-2">{successMessage}</p>
                  
                  {invitationLink ? (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <p className="font-semibold text-sm mb-2">🔗 Password Setup Link:</p>
                      <p className="text-xs text-gray-600 mb-2">Click the link below to set your password:</p>
                      <a 
                        href={invitationLink}
                        className="block text-xs text-primary-600 hover:text-primary-700 break-all underline mb-2"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {invitationLink}
                      </a>
                      <button
                        onClick={() => window.location.href = invitationLink}
                        className="btn-primary text-sm py-2 px-4 w-full"
                      >
                        Open Password Setup Link
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <p className="font-semibold text-sm mb-1">📧 Next Steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Check your email inbox (and spam folder) for the invitation email</li>
                        <li>Click the "Set Up Your Account" link in the email</li>
                        <li>You'll be brought back here to set your password</li>
                        <li>Once your password is set, you'll be automatically signed in</li>
                      </ol>
                    </div>
                  )}
                  
                  {prefillEmail && (
                    <div className="mt-3">
                      <p className="text-xs text-green-700 mb-2">
                        Account email: <strong>{prefillEmail}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={handleResendInvitationEmail}
                        disabled={resendingEmail}
                        className="text-xs text-primary-600 hover:text-primary-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendingEmail ? 'Sending...' : '📧 Resend Invitation Email'}
                      </button>
                    </div>
                  )}
                  
                  {resendEmailMessage && (
                    <div className={`mt-3 p-3 rounded border ${
                      resendEmailMessage.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <p className="text-xs font-semibold mb-1">
                        {resendEmailMessage.type === 'success' ? '✓' : '✗'} {resendEmailMessage.text}
                      </p>
                      {resendEmailMessage.link && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 mb-1">Direct link:</p>
                          <a 
                            href={resendEmailMessage.link} 
                            className="text-xs text-primary-600 hover:text-primary-700 break-all underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {resendEmailMessage.link}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {showPasswordSetup ? (
            <div className="space-y-4">
              <div className="mb-4 rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-800">
                <p className="font-semibold mb-1">Welcome to Merxus!</p>
                <p>Please set a password for your account to continue.</p>
              </div>
              
              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <div>
                  <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="setup-email"
                    type="email"
                    value={passwordSetupEmail}
                    disabled
                    className="input-field bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="Enter your new password"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Confirm your new password"
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="btn-primary w-full"
                >
                  {loading ? 'Setting Password...' : 'Set Password & Sign In'}
                </button>
              </form>
            </div>
          ) : invited && !showResetForm ? (
            <div className="mb-4 rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-800">
              <p className="font-semibold mb-1">Welcome to Merxus!</p>
              <p>Your account has been set up. Please set your password using "Forgot Password" below, then sign in.</p>
            </div>
          ) : null}
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
              {successMessage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <p className="font-semibold">⚠️ Can't sign in yet?</p>
                  <p className="mt-1">If you just created an account, you need to set your password first. Check your email for the invitation link with "Set Up Your Account" button.</p>
                </div>
              )}
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

