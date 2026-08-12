export const PLAN_ORDER = {
  base: 0,
  professional: 1,
  elite: 2,
};

const VALID_TIERS = new Set(Object.keys(PLAN_ORDER));

export function getTierLabel(tier) {
  if (tier === 'elite') return 'Elite';
  if (tier === 'professional') return 'Professional';
  return 'Basic';
}

export function meetsPlanRequirement(currentTier, requiredTier) {
  return (PLAN_ORDER[currentTier] ?? 0) >= (PLAN_ORDER[requiredTier] ?? 0);
}

export function getTierEntitlements(tier) {
  const order = PLAN_ORDER[tier] ?? 0;
  return {
    professional: order >= PLAN_ORDER.professional,
    elite: order >= PLAN_ORDER.elite,
  };
}

export function normalizePlanTier(plan, { elevatedPlanTiersEnabled = false } = {}) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (!normalized || !elevatedPlanTiersEnabled) return 'base';
  if (normalized.includes('elite') || normalized.includes('enterprise')) return 'elite';
  if (normalized.includes('professional') || /(^|[^a-z0-9])pro($|[^a-z0-9])/.test(normalized)) return 'professional';
  return 'base';
}

export function buildSubscriptionSummary(
  subscription = {},
  { elevatedPlanTiersEnabled = false } = {},
) {
  const authoritativeTier = VALID_TIERS.has(subscription?.tier)
    ? subscription.tier
    : null;
  const tier = authoritativeTier || normalizePlanTier(
    subscription?.plan,
    { elevatedPlanTiersEnabled },
  );

  return {
    ...subscription,
    tier,
    tierLabel: authoritativeTier && subscription?.tierLabel
      ? subscription.tierLabel
      : getTierLabel(tier),
    entitlements: getTierEntitlements(tier),
  };
}
