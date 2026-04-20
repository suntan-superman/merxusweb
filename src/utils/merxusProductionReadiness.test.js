import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReadinessExportRows,
  buildReadinessFocusOptions,
  filterReadinessItemsByFocus,
  formatRuntimePath,
  getReadinessToneClasses,
  labelizeReadinessValue,
} from './merxusProductionReadiness.js';

test('buildReadinessExportRows includes overview, blockers, categories, and commands', () => {
  const rows = buildReadinessExportRows({
    status: 'attention',
    deployBlockers: [{ key: 'required_env', count: 2 }],
    validationCategories: [{ key: 'reviews', itemCount: 3 }],
    operationalAuditCommands: ['npm run ops:audit -- --attention-only'],
  });

  assert.equal(rows.length, 4);
  assert.equal(rows[0].section, 'overview');
  assert.equal(rows[1].section, 'deploy_blockers');
  assert.equal(rows[2].section, 'validation_categories');
  assert.equal(rows[3].section, 'operational_commands');
});

test('buildReadinessFocusOptions de-duplicates blocker and category keys', () => {
  const options = buildReadinessFocusOptions(
    [{ key: 'required_env' }, { key: 'reviews', label: 'Reviews' }],
    [{ key: 'reviews', label: 'Review Checks' }, { key: 'operations' }]
  );

  assert.deepEqual(options, [
    { key: 'required_env', label: 'Required Env' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'operations', label: 'Operations' },
  ]);
});

test('filterReadinessItemsByFocus returns all items or only matching items', () => {
  const items = [{ key: 'reviews' }, { key: 'operations' }];

  assert.deepEqual(filterReadinessItemsByFocus(items, ''), items);
  assert.deepEqual(filterReadinessItemsByFocus(items, 'reviews'), [{ key: 'reviews' }]);
});

test('readiness formatting helpers provide stable fallbacks', () => {
  assert.equal(getReadinessToneClasses('attention'), 'border-amber-200 bg-amber-50 text-amber-800');
  assert.equal(formatRuntimePath(''), 'Unavailable in this runtime');
  assert.equal(labelizeReadinessValue('push_and_scheduler'), 'Push And Scheduler');
});
