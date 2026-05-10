const MERXUS_TENANT_TYPES = new Set(['merxus', 'restaurant', 'voice', 'real_estate']);
const SUPPORT_ROLES = new Set([
  'super_admin',
  'admin',
  'support_admin',
  'support_agent',
  'sales_agent',
  'billing_agent',
  'dispatcher',
  'viewer',
]);

export function hasMerxusTenantClaims(claims = null) {
  if (!claims) return false;
  if (claims.type === 'merxus') return true;
  return Boolean(
    MERXUS_TENANT_TYPES.has(claims.type) &&
      (claims.restaurantId || claims.officeId || claims.agentId || claims.tenantId)
  );
}

export function isSupportConsoleAccount(claims = null) {
  if (!claims) return false;
  const supportRole = claims.supportRole || claims.role || null;
  const hasSupportRole =
    SUPPORT_ROLES.has(String(supportRole || '').trim()) &&
    (
      Object.prototype.hasOwnProperty.call(claims, 'supportRole') ||
      Array.isArray(claims.allowedProducts) ||
      Array.isArray(claims.products) ||
      claims.supportUser === true
    );

  return Boolean(hasSupportRole && !hasMerxusTenantClaims(claims));
}

export function getPostLoginPath(claims = null) {
  if (!claims) return null;
  if (isSupportConsoleAccount(claims)) return '/unsupported-account?reason=support-console';
  if (claims.invitedUser === true && claims.phoneVerified === false) return '/verify-phone';
  if (claims.type === 'merxus') {
    return claims.role === 'super_admin' ? '/merxus/select-tenant' : '/merxus';
  }
  if (claims.type === 'restaurant') return '/restaurant';
  if (claims.type === 'voice') return '/voice';
  if (claims.type === 'real_estate') return '/estate';
  return '/unsupported-account?reason=no-tenant';
}
