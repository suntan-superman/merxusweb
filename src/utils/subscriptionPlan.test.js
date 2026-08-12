import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSubscriptionSummary,
  meetsPlanRequirement,
} from './subscriptionPlan.js';

test('authoritative backend Elite tier is preserved when legacy plan inference is disabled', () => {
  const summary = buildSubscriptionSummary({
    plan: 'merxus_restaurant_basic',
    tier: 'elite',
    tierLabel: 'Elite',
    entitlements: { professional: true, elite: true },
  });

  assert.equal(summary.tier, 'elite');
  assert.equal(summary.tierLabel, 'Elite');
  assert.deepEqual(summary.entitlements, { professional: true, elite: true });
  assert.equal(meetsPlanRequirement(summary.tier, 'elite'), true);
});

test('legacy elevated plan names remain Basic unless client inference is enabled', () => {
  const disabled = buildSubscriptionSummary({ plan: 'merxus_restaurant_elite' });
  const enabled = buildSubscriptionSummary(
    { plan: 'merxus_restaurant_elite' },
    { elevatedPlanTiersEnabled: true },
  );

  assert.equal(disabled.tier, 'base');
  assert.equal(enabled.tier, 'elite');
});

test('invalid server tiers cannot grant elevated access', () => {
  const summary = buildSubscriptionSummary({
    tier: 'owner',
    entitlements: { professional: true, elite: true },
  });

  assert.equal(summary.tier, 'base');
  assert.deepEqual(summary.entitlements, { professional: false, elite: false });
});
