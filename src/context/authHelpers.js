/**
 * Auth helpers - role checks and utility functions
 */
import { TENANT_TYPES, USER_ROLES } from './authConstants';

/**
 * Build the auth context value object
 * @param {Object} params - Auth state
 * @returns {Object} Context value
 */
export function buildAuthContextValue({
  user,
  token,
  loading,
  userClaims,
  refreshToken,
  signOut,
}) {
  return {
    // Core state
    user,
    token,
    loading,
    userClaims,

    // Tenant IDs (convenience accessors)
    restaurantId: userClaims?.restaurantId,
    officeId: userClaims?.officeId,
    agentId: userClaims?.agentId,
    tenantId: userClaims?.restaurantId || userClaims?.officeId || userClaims?.agentId,
    tenantType: userClaims?.type,

    // Actions
    refreshToken,
    signOut,

    // Tenant type checks
    isRestaurantUser: userClaims?.type === TENANT_TYPES.RESTAURANT,
    isVoiceUser: userClaims?.type === TENANT_TYPES.VOICE,
    isRealEstateUser: userClaims?.type === TENANT_TYPES.REAL_ESTATE,
    isMerxusAdmin: userClaims?.type === TENANT_TYPES.MERXUS,

    // Role checks
    isOwner: userClaims?.role === USER_ROLES.OWNER,
    isManager: userClaims?.role === USER_ROLES.MANAGER,
    isStaff: userClaims?.role === USER_ROLES.STAFF,
    isMerxusAdminRole: userClaims?.role === USER_ROLES.MERXUS_ADMIN,
    isMerxusSupport: userClaims?.role === USER_ROLES.MERXUS_SUPPORT,
  };
}

/**
 * Build debug object for development
 * @param {Object} contextValue - Auth context value
 * @param {Function} getTokenClaims - Function to get token claims
 * @returns {Object} Debug object
 */
export function buildDebugObject(contextValue, getTokenClaims) {
  return {
    ...contextValue,
    refreshToken: async () => {
      const result = await contextValue.refreshToken();
      console.log('Manual token refresh result:', result);
      return result;
    },
    getTokenClaims: async () => {
      const claims = await getTokenClaims(contextValue.user);
      console.log('Current token claims:', claims);
      return claims;
    },
  };
}

/**
 * Check if user has any of the specified roles
 * @param {Object} userClaims - User claims
 * @param {string[]} roles - Roles to check
 * @returns {boolean}
 */
export function hasAnyRole(userClaims, roles) {
  if (!userClaims?.role) return false;
  return roles.includes(userClaims.role);
}

/**
 * Check if user has access to a specific tenant
 * @param {Object} userClaims - User claims
 * @param {string} tenantId - Tenant ID to check
 * @returns {boolean}
 */
export function hasTenantAccess(userClaims, tenantId) {
  if (!userClaims || !tenantId) return false;
  
  const userTenantId = userClaims.restaurantId || userClaims.officeId || userClaims.agentId;
  return userTenantId === tenantId;
}

/**
 * Check if user is admin (merxus admin or support)
 * @param {Object} userClaims - User claims
 * @returns {boolean}
 */
export function isAdminUser(userClaims) {
  return (
    userClaims?.type === TENANT_TYPES.MERXUS ||
    userClaims?.role === USER_ROLES.MERXUS_ADMIN ||
    userClaims?.role === USER_ROLES.MERXUS_SUPPORT
  );
}

/**
 * Get display-friendly tenant type name
 * @param {string} tenantType - Tenant type
 * @returns {string}
 */
export function getTenantTypeName(tenantType) {
  switch (tenantType) {
    case TENANT_TYPES.RESTAURANT:
      return 'Restaurant';
    case TENANT_TYPES.VOICE:
      return 'Voice/Office';
    case TENANT_TYPES.REAL_ESTATE:
      return 'Real Estate';
    case TENANT_TYPES.MERXUS:
      return 'Merxus Admin';
    default:
      return 'Unknown';
  }
}

/**
 * Get display-friendly role name
 * @param {string} role - User role
 * @returns {string}
 */
export function getRoleName(role) {
  switch (role) {
    case USER_ROLES.OWNER:
      return 'Owner';
    case USER_ROLES.MANAGER:
      return 'Manager';
    case USER_ROLES.STAFF:
      return 'Staff';
    case USER_ROLES.MERXUS_ADMIN:
      return 'Administrator';
    case USER_ROLES.MERXUS_SUPPORT:
      return 'Support';
    default:
      return 'Unknown';
  }
}
