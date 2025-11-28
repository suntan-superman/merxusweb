import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Automatically redirects authenticated users to their appropriate portal
 * when they're on public routes (home, features, pricing, etc.)
 */
export default function AutoRedirect() {
  const { user, loading, userClaims } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if still loading or no user
    if (loading || !user || !userClaims) {
      return;
    }

    // Only redirect from public routes
    const publicRoutes = ['/', '/features', '/pricing', '/onboarding'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    if (isPublicRoute) {
      // Redirect based on user type
      if (userClaims.type === 'merxus') {
        navigate('/merxus', { replace: true });
      } else if (userClaims.type === 'restaurant') {
        navigate('/restaurant', { replace: true });
      }
    }
  }, [user, loading, userClaims, location.pathname, navigate]);

  return null; // This component doesn't render anything
}

