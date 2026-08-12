import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBillingAmount,
  getPlanPricing,
  getPricingTenantKey,
  isCompletePlanPricing,
  normalizePlanTier,
} from './billingPricing.js';

test('billing pricing helpers select live tenant tiers without fallbacks', () => {
  const plan = {
    tier: 'professional', label: 'Pro', onboardingUnitAmount: 9900,
    subscriptionUnitAmount: 9900, currency: 'usd',
    onboardingPriceId: 'price_onboarding', subscriptionPriceId: 'price_subscription',
  };
  const pricing = { displayPlans: { office: [plan] } };
  assert.equal(getPricingTenantKey('voice'), 'office');
  assert.equal(normalizePlanTier('pro'), 'professional');
  assert.equal(getPlanPricing(pricing, 'voice', 'pro'), plan);
  assert.equal(formatBillingAmount(plan.subscriptionUnitAmount, plan.currency), '$99.00');
  assert.equal(isCompletePlanPricing(plan), true);
  assert.equal(getPlanPricing(pricing, 'voice', 'elite'), null);
  assert.equal(formatBillingAmount(undefined), null);
});
