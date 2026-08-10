const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
]);

export function getTenantBillingActionState(tenant = {}) {
  const status = String(tenant.subscriptionStatus || '').trim().toLowerCase();
  const isPaused = tenant.billingPaused === true || status === 'paused';
  const hasManageableSubscription = isPaused || MANAGEABLE_SUBSCRIPTION_STATUSES.has(status);

  return {
    isPaused,
    hasManageableSubscription,
    canPauseOrResume: hasManageableSubscription,
    canRefund: hasManageableSubscription,
    canCancel: hasManageableSubscription && tenant.cancelAtPeriodEnd !== true,
    canViewRefundHistory: hasManageableSubscription,
  };
}

