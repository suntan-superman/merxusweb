import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultNavigationPreferences,
  mergeNavigationPreferences,
  sanitizeQuickStartIds,
} from './navigationPreferencesModel.js';

const availableItems = [
  { id: 'dashboard', defaultQuickStart: true },
  { id: 'calls', defaultQuickStart: true },
  { id: 'sms', defaultQuickStart: true },
  { id: 'reviews' },
  { id: 'billing' },
  { id: 'team_access' },
  { id: 'settings' },
];

test('sanitizeQuickStartIds removes invalid ids and duplicates', () => {
  assert.deepEqual(
    sanitizeQuickStartIds({
      quickStartIds: ['dashboard', 'missing', 'sms', 'dashboard', 'reviews'],
      availableItems,
    }),
    ['dashboard', 'sms', 'reviews'],
  );
});

test('default navigation preferences include tenant defaults and owner admin actions', () => {
  const prefs = buildDefaultNavigationPreferences({
    tenantType: 'restaurant',
    role: 'owner',
    availableItems,
  });

  assert.deepEqual(prefs.quickStartIds, ['dashboard', 'calls', 'sms', 'billing', 'team_access', 'settings']);
  assert.equal(prefs.collapsedGroups.pro, true);
  assert.equal(prefs.collapsedGroups.elite, true);
});

test('mergeNavigationPreferences preserves saved collapse state and sanitizes quick start ids', () => {
  const defaults = buildDefaultNavigationPreferences({ availableItems });
  const prefs = mergeNavigationPreferences({
    defaults,
    availableItems,
    savedPrefs: {
      quickStartIds: ['reviews', 'bad', 'reviews', 'calls'],
      collapsedGroups: { pro: false, admin: false },
    },
  });

  assert.deepEqual(prefs.quickStartIds, ['reviews', 'calls']);
  assert.equal(prefs.collapsedGroups.pro, false);
  assert.equal(prefs.collapsedGroups.admin, false);
  assert.equal(prefs.collapsedGroups.elite, true);
});
