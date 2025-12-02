import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireRestaurant = false,
  requireVoice = false,  // Require voice tenant
  requireRealEstate = false,  // NEW: Require real estate tenant
  requireMerxus = false,
  requireOwner = false,
  requireManager = false,
  requireAdmin = false,
}) {
  const { user, loading, userClaims, isRestaurantUser, isVoiceUser, isRealEstateUser, isMerxusAdmin, isOwner, isManager, isMerxusAdminRole } = useAuth();
  const location = useLocation();

  // Debug logging - use useEffect to avoid logging on every render
  useEffect(() => {
    if (import.meta.env.DEV) {
      const state = {
        loading,
        hasUser: !!user,
        hasClaims: !!userClaims,
        userClaims: userClaims ? JSON.parse(JSON.stringify(userClaims)) : null,
        requireAuth,
        requireRestaurant,
        requireVoice,
        requireRealEstate,  // NEW
        requireMerxus,
        isRestaurantUser,
        isVoiceUser,
        isRealEstateUser,  // NEW
        isMerxusAdmin,
        path: location.pathname,
        // Detailed checks
        userClaimsType: userClaims?.type,
        userClaimsRole: userClaims?.role,
        typeCheck: userClaims?.type === 'merxus',
        roleCheck: userClaims?.role === 'merxus_admin',
        willBlockMerxus: requireMerxus && user && (!userClaims || !isMerxusAdmin),
        willBlockRestaurant: requireRestaurant && user && (!userClaims || !isRestaurantUser),
        willBlockVoice: requireVoice && user && (!userClaims || !isVoiceUser),
        willBlockRealEstate: requireRealEstate && user && (!userClaims || !isRealEstateUser),  // NEW
      };
      console.log('ProtectedRoute state:', state);
      
      // Log what will happen
      if (requireMerxus && user && (!userClaims || !isMerxusAdmin)) {
        console.warn('⚠️ Will block Merxus route:', {
          requireMerxus,
          hasUser: !!user,
          hasClaims: !!userClaims,
          userClaimsType: userClaims?.type,
          isMerxusAdmin,
        });
      }
      if (requireRestaurant && user && (!userClaims || !isRestaurantUser)) {
        console.warn('⚠️ Will block Restaurant route:', {
          requireRestaurant,
          hasUser: !!user,
          hasClaims: !!userClaims,
          userClaimsType: userClaims?.type,
          isRestaurantUser,
        });
      }
      if (requireVoice && user && (!userClaims || !isVoiceUser)) {
        console.warn('⚠️ Will block Voice route:', {
          requireVoice,
          hasUser: !!user,
          hasClaims: !!userClaims,
          userClaimsType: userClaims?.type,
          isVoiceUser,
        });
      }
      if (requireRealEstate && user && (!userClaims || !isRealEstateUser)) {
        console.warn('⚠️ Will block Real Estate route:', {
          requireRealEstate,
          hasUser: !!user,
          hasClaims: !!userClaims,
          userClaimsType: userClaims?.type,
          isRealEstateUser,
        });
      }
    }
  }, [loading, user, userClaims, requireAuth, requireRestaurant, requireVoice, requireRealEstate, requireMerxus, isRestaurantUser, isVoiceUser, isRealEstateUser, isMerxusAdmin, location.pathname]);

  // Always wait for loading to complete
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in but claims are missing after loading completes,
  // token might be invalid - redirect to login
  if (requireAuth && user && (!userClaims || (!userClaims.role && !userClaims.type))) {
    // User exists but claims are missing or invalid - token might be expired or invalid
    // Redirect to login to force re-authentication
    console.warn('User logged in but claims missing or invalid. Redirecting to login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAuth && !user) {
    // Redirect to login with return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRestaurant && user && (!userClaims || !isRestaurantUser)) {
    // User is logged in but not a restaurant user
    console.warn('User logged in but not a restaurant user. Redirecting to home.');
    return <Navigate to="/" replace />;
  }

  if (requireVoice && user && (!userClaims || !isVoiceUser)) {
    // User is logged in but not a voice user
    console.warn('User logged in but not a voice user. Redirecting to home.');
    return <Navigate to="/" replace />;
  }

  if (requireRealEstate && user && (!userClaims || !isRealEstateUser)) {
    // User is logged in but not a real estate user
    console.warn('User logged in but not a real estate user. Redirecting to home.');
    return <Navigate to="/" replace />;
  }

  if (requireMerxus && user && (!userClaims || !isMerxusAdmin)) {
    // User is logged in but not a Merxus admin
    console.warn('User logged in but not a Merxus admin. Redirecting to home.');
    return <Navigate to="/" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/restaurant" replace />;
  }

  if (requireManager && !isManager && !isOwner) {
    return <Navigate to="/restaurant" replace />;
  }

  if (requireAdmin && !isMerxusAdminRole) {
    return <Navigate to="/merxus" replace />;
  }

  return children;
}

