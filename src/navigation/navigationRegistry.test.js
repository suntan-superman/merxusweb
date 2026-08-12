import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationGroups, getNavigationItems, NAV_ITEMS } from './navigationRegistry.js';

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

test('each tenant portal exposes review integrations in the Elite navigation group', () => {
  const expected = [
    ['restaurant', 'restaurant_review_integrations', '/restaurant/feedback/integrations'],
    ['voice', 'voice_review_integrations', '/voice/feedback/integrations'],
    ['real_estate', 'estate_review_integrations', '/estate/feedback/integrations'],
  ];

  for (const [tenantType, id, path] of expected) {
    const item = getNavigationItems({ tenantType, role: 'owner' }).find((candidate) => candidate.id === id);
    assert.ok(item, `${tenantType} should expose review integrations`);
    assert.equal(item.path, path);
    assert.equal(item.groupId, 'elite');
    assert.equal(item.requiredPlan, 'elite');
  }
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

test('navigation icons use named app icons instead of emoji-only values', () => {
  for (const item of NAV_ITEMS) {
    assert.match(item.icon, /^[A-Za-z][A-Za-z0-9]*$/, `${item.id} should use a named icon`);
  }
});
