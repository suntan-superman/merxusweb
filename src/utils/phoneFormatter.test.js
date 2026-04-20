import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPhoneDisplay,
  formatPhoneInput,
  getRawPhone,
  isValidPhone,
  toE164,
} from './phoneFormatter.js';

test('web phone formatting helpers normalize input and display values', () => {
  assert.equal(formatPhoneInput('6612345678'), '(661) 234-5678');
  assert.equal(formatPhoneInput('(661) 234-5678999'), '(661) 234-5678');
  assert.equal(formatPhoneDisplay('6612345678'), '+1 (661) 234-5678');
  assert.equal(formatPhoneDisplay('+16612345678'), '+1 (661) 234-5678');
  assert.equal(formatPhoneDisplay('+442012341234'), '+442012341234');
});

test('web phone helpers expose raw digits, validation, and safe E164 conversion', () => {
  assert.equal(getRawPhone('(661) 234-5678'), '6612345678');
  assert.equal(isValidPhone('(661) 234-5678'), true);
  assert.equal(isValidPhone('555'), false);
  assert.equal(toE164('(661) 234-5678'), '+16612345678');
  assert.equal(toE164('+442012341234'), '+442012341234');
  assert.equal(toE164('555'), '');
});
