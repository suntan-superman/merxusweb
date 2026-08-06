import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
global.window = {
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
};

const {
  clearRememberedLoginEmail,
  getRememberedLoginEmail,
  saveRememberedLoginEmail,
} = await import('./loginPreferences.js');

test('remembered login email is normalized and can be cleared', () => {
  saveRememberedLoginEmail(' Support@Merxus.ai ');
  assert.equal(getRememberedLoginEmail(), 'support@merxus.ai');

  clearRememberedLoginEmail();
  assert.equal(getRememberedLoginEmail(), '');
});
