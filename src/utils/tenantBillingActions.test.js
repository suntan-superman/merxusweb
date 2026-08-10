import test from 'node:test';
import assert from 'node:assert/strict';

import { getTenantBillingActionState } from './tenantBillingActions.js';

test('paused subscription exposes the resume and related billing actions', () => {
  assert.deepEqual(
    getTenantBillingActionState({
      subscriptionStatus: 'paused',
      billingPaused: true,
      cancelAtPeriodEnd: false,
    }),
    {
      isPaused: true,
      hasManageableSubscription: true,
      canPauseOrResume: true,
      canRefund: true,
      canCancel: true,
      canViewRefundHistory: true,
    },
  );
});

test('billingPaused flag selects Resume even if the stored Stripe status is active', () => {
  const actions = getTenantBillingActionState({
    subscriptionStatus: 'active',
    billingPaused: true,
  });

  assert.equal(actions.isPaused, true);
  assert.equal(actions.canPauseOrResume, true);
});

test('tenant without a subscription has no subscription billing actions', () => {
  const actions = getTenantBillingActionState({
    subscriptionStatus: 'No Subscription',
  });

  assert.equal(actions.hasManageableSubscription, false);
  assert.equal(actions.canPauseOrResume, false);
  assert.equal(actions.canRefund, false);
  assert.equal(actions.canCancel, false);
  assert.equal(actions.canViewRefundHistory, false);
});

