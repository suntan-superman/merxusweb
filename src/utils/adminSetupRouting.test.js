import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SETUP_COMPLETION_PATH,
  getAdminSetupCompletionPath,
} from './adminSetupRouting.js';

test('admin demo setup returns to tenant management', () => {
  assert.equal(ADMIN_SETUP_COMPLETION_PATH, '/merxus/tenants');
  assert.equal(getAdminSetupCompletionPath(), '/merxus/tenants');
});

