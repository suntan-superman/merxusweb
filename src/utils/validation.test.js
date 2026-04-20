import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createValidator,
  estateBrandSchema,
  phoneSchema,
  requiredPhoneSchema,
  validateField,
  validateForm,
  voiceIndustrySchema,
} from './validation.js';

test('phone validation schemas normalize digits and enforce required lengths', () => {
  assert.equal(phoneSchema.parse('(661) 234-5678'), '6612345678');
  assert.equal(phoneSchema.parse(''), '');
  assert.equal(requiredPhoneSchema.parse('+1 (661) 234-5678'), '16612345678');
  assert.throws(() => requiredPhoneSchema.parse('555'), /Phone number must be 10 digits/);
});

test('validateForm returns parsed data and field-mapped errors', () => {
  const valid = validateForm(estateBrandSchema, { agentName: 'Ada Agent', brokerageName: 'Merxus Realty' });
  const invalid = validateForm(voiceIndustrySchema, { category: '', industry: '' });

  assert.equal(valid.success, true);
  assert.equal(valid.data.agentName, 'Ada Agent');
  assert.deepEqual(invalid, {
    success: false,
    errors: {
      category: 'Please select a category',
      industry: 'Please select an industry',
    },
  });
});

test('validateField and createValidator expose schema-friendly form helpers', () => {
  const validator = createValidator(estateBrandSchema);

  assert.equal(validateField(estateBrandSchema, 'agentName', 'A'), 'Name must be at least 2 characters');
  assert.equal(validateField(estateBrandSchema, 'agentName', 'Ada'), null);
  assert.deepEqual(
    validator({ agentName: '', brokerageName: '' }),
    {
      success: false,
      errors: {
        agentName: 'Name must be at least 2 characters',
      },
    },
  );
});
