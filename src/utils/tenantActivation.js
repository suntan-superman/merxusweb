/**
 * A tenant can have every prerequisite completed while its activation claim is
 * still pending. Only the server-side completion step clears that claim.
 */
export function shouldLeaveTenantActivation(status = null) {
  return status?.activationRequired === false;
}
