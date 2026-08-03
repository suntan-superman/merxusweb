import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldLeaveTenantActivation } from './tenantActivation.js';

test('activation page remains available until the activation claim is cleared', () => {
  assert.equal(
    shouldLeaveTenantActivation({ activationRequired: true, activationComplete: true }),
    false
  );
  assert.equal(
    shouldLeaveTenantActivation({ activationRequired: false, activationComplete: true }),
    true
  );
});
