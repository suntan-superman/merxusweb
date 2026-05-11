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

test('getNavigationItems includes role-scoped Merxus admin items', () => {
  const superAdminItems = getNavigationItems({ tenantType: 'merxus', role: 'super_admin' });
  const merxusAdminItems = getNavigationItems({ tenantType: 'merxus', role: 'merxus_admin' });

  assert.ok(superAdminItems.some((item) => item.id === 'merxus_team_access'));
  assert.ok(superAdminItems.some((item) => item.id === 'merxus_setup_wizard'));
  assert.equal(superAdminItems.some((item) => item.id === 'merxus_system_settings'), false);

  assert.ok(merxusAdminItems.some((item) => item.id === 'merxus_setup_wizard'));
  assert.ok(merxusAdminItems.some((item) => item.id === 'merxus_system_settings'));
  assert.equal(merxusAdminItems.some((item) => item.id === 'merxus_team_access'), false);
});
