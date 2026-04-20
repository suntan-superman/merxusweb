import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCrossTenantFocusOptions,
  filterCrossTenantItems,
  filterCrossTenantQueue,
  getCrossTenantBadgeClasses,
  getCrossTenantToneClasses,
  getCrossTenantTopIssueLabel,
  getNarrativeToneClasses,
  labelizeCrossTenantValue,
} from './systemCrossTenant.js';

test('cross-tenant formatting helpers normalize labels and severity classes', () => {
  assert.equal(labelizeCrossTenantValue('real_estate'), 'Real Estate');
  assert.equal(getCrossTenantToneClasses('critical'), 'border-red-200 bg-red-50 text-red-800');
  assert.equal(getCrossTenantBadgeClasses('warning'), 'bg-amber-100 text-amber-700');
  assert.equal(getNarrativeToneClasses('healthy'), 'border-emerald-200 bg-emerald-50 text-emerald-800');
});

test('buildCrossTenantFocusOptions creates deterministic focus links and selection state', () => {
  const options = buildCrossTenantFocusOptions('voice');

  assert.deepEqual(options[0], {
    key: 'all',
    label: 'All',
    href: '/merxus/analytics',
    selected: false,
  });
  assert.deepEqual(options[2], {
    key: 'voice',
    label: 'Voice',
    href: '/merxus/analytics?focus=voice',
    selected: true,
  });
});

test('cross-tenant filters honor selected tenant focus', () => {
  const items = [{ tenantType: 'restaurant' }, { tenantType: 'voice' }];
  const queue = [{ tenantType: 'voice' }, { tenantType: 'real_estate' }];

  assert.deepEqual(filterCrossTenantItems(items, 'voice'), [{ tenantType: 'voice' }]);
  assert.deepEqual(filterCrossTenantQueue(queue, 'voice'), [{ tenantType: 'voice' }]);
  assert.deepEqual(filterCrossTenantItems(items, 'all'), items);
});

test('getCrossTenantTopIssueLabel falls back to Healthy', () => {
  assert.equal(getCrossTenantTopIssueLabel({ key: 'review_sync_attention' }), 'Review Sync Attention');
  assert.equal(getCrossTenantTopIssueLabel(null), 'Healthy');
});
