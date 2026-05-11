import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationGroups, getNavigationItems } from './navigationRegistry.js';

test('getNavigationItems filters by tenant type and role', () => {
  const ownerItems = getNavigationItems({ tenantType: 'restaurant', role: 'owner' });
  const staffItems = getNavigationItems({ tenantType: 'restaurant', role: 'staff' });

  assert.ok(ownerItems.some((item) => item.id === 'restaurant_team_access'));
  assert.equal(staffItems.some((item) => item.id === 'restaurant_team_access'), false);
  assert.equal(ownerItems.every((item) => item.tenantType === 'restaurant'), true);
});

test('getNavigationItems can exclude locked plan items', () => {
  const unlockedOnly = getNavigationItems({
    tenantType: 'voice',
    role: 'owner',
    includeLocked: false,
  });

  assert.equal(unlockedOnly.some((item) => item.requiredPlan), false);
  assert.ok(unlockedOnly.some((item) => item.id === 'voice_sms_inbox'));
});

test('getNavigationGroups returns sorted stable groups with Elite above admin', () => {
  const groups = getNavigationGroups();
  assert.deepEqual(groups.map((group) => group.id), ['core', 'pro', 'elite', 'admin']);
  assert.equal(groups.find((group) => group.id === 'elite')?.summary, 'Includes Pro');
});
