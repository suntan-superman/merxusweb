import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Automatically redirects authenticated users to their appropriate portal
 * when they're on public routes (home, features, pricing, etc.)
 */
export default function AutoRedirect() {
  const { user, loading, userClaims, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if still loading or no user
    if (loading || !user) {
      return;
    }

    const allowOnboardingAppleFlow =
      location.pathname === '/onboarding' &&
      sessionStorage.getItem('merxus_onboarding_auth_flow') === 'apple';

    if (needsOnboarding && !allowOnboardingAppleFlow) {
      navigate('/onboarding-wizard', { replace: true });
      return;
    }

    // Only redirect from public routes
    const publicRoutes = ['/', '/features', '/onboarding'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    if (isPublicRoute) {
      // Redirect based on user type
      if (userClaims.type === 'merxus') {
        // Super-admins get a tenant selector, regular admins go to restaurant portal
        if (userClaims.role === 'super_admin') {
          navigate('/merxus/select-tenant', { replace: true });
        } else {
          navigate('/merxus', { replace: true });
        }
      } else if (userClaims.type === 'restaurant') {
        navigate('/restaurant', { replace: true });
      } else if (userClaims.type === 'voice') {
        navigate('/voice', { replace: true });
      } else if (userClaims.type === 'real_estate') {
        navigate('/estate', { replace: true });
      }
    }
  }, [user, loading, userClaims, needsOnboarding, location.pathname, navigate]);

  return null; // This component doesn't render anything
}

