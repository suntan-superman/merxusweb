import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPostLoginPath, isSupportConsoleAccount } from '../utils/accountRouting';

const ONBOARDING_TENANT_TYPE_KEY = 'merxus_onboarding_selected_type';
const VALID_TENANT_TYPES = new Set(['restaurant', 'voice', 'real_estate']);

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

    if (needsOnboarding) {
      const params = new URLSearchParams(location.search || '');
      const queryType = params.get('type');
      const storedType = sessionStorage.getItem(ONBOARDING_TENANT_TYPE_KEY);
      const resolvedType = VALID_TENANT_TYPES.has(queryType)
        ? queryType
        : VALID_TENANT_TYPES.has(storedType)
        ? storedType
        : null;

      if (resolvedType) {
        navigate(`/onboarding-wizard?type=${encodeURIComponent(resolvedType)}`, { replace: true });
      } else {
        navigate('/onboarding-wizard', { replace: true });
      }
      return;
    }

    // Apple users can be authenticated before claims are assigned.
    if (!userClaims) {
      return;
    }

    if (userClaims.activationRequired === true && location.pathname !== '/tenant-activation') {
      navigate('/tenant-activation', { replace: true });
      return;
    }

    if (isSupportConsoleAccount(userClaims) && location.pathname !== '/unsupported-account') {
      navigate('/unsupported-account?reason=support-console', { replace: true });
      return;
    }

    if (
      userClaims.invitedUser === true &&
      userClaims.phoneVerified === false &&
      location.pathname !== '/verify-phone'
    ) {
      navigate('/verify-phone', { replace: true });
      return;
    }

    // Only redirect from public routes
    const publicRoutes = ['/', '/features', '/onboarding'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    if (isPublicRoute) {
      const nextPath = getPostLoginPath(userClaims);
      if (nextPath) {
        navigate(nextPath, { replace: true });
      }
    }
  }, [user, loading, userClaims, needsOnboarding, location.pathname, navigate]);

  return null; // This component doesn't render anything
}

