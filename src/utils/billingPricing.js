export const BILLING_PLAN_TIERS = ['basic', 'professional', 'elite'];

export function normalizePlanTier(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'pro' || normalized === 'professional') return 'professional';
  if (normalized === 'elite') return 'elite';
  return 'basic';
}

export function getPricingTenantKey(tenantType) {
  return tenantType === 'voice' || tenantType === 'office' ? 'office' : tenantType;
}

export function getPlanPricing(pricingData, tenantType, tier = 'basic') {
  const pricingKey = getPricingTenantKey(tenantType);
  const normalizedTier = normalizePlanTier(tier);
  const displayPlan = pricingData?.displayPlans?.[pricingKey]?.find(
    (plan) => normalizePlanTier(plan.tier) === normalizedTier,
  );
  if (displayPlan) return displayPlan;

  const prices = pricingData?.tenants?.[pricingKey]?.plans?.[normalizedTier];
  if (!prices?.onboarding || !prices?.subscription) return null;
  return {
    tier: normalizedTier,
    label: normalizedTier === 'professional' ? 'Pro' : `${normalizedTier[0].toUpperCase()}${normalizedTier.slice(1)}`,
    name: normalizedTier === 'professional' ? 'Pro' : normalizedTier,
    onboardingUnitAmount: prices.onboarding.unitAmount,
    subscriptionUnitAmount: prices.subscription.unitAmount,
    currency: prices.subscription.currency || prices.onboarding.currency,
    onboardingPriceId: prices.onboarding.id,
    subscriptionPriceId: prices.subscription.id,
    features: [],
  };
}

export function formatBillingAmount(amount, currency = 'usd') {
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'usd').toUpperCase(),
    }).format(amount / 100);
  } catch {
    return null;
  }
}

export function isCompletePlanPricing(plan) {
  return Boolean(
    plan &&
    Number.isFinite(plan.onboardingUnitAmount) &&
    Number.isFinite(plan.subscriptionUnitAmount) &&
    plan.onboardingPriceId &&
    plan.subscriptionPriceId,
  );
}
