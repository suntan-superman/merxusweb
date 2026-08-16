import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRealEstateCompanyPhones } from './realEstateCompanyPresentation.js';

test('resolves legacy business-phone fields separately from the Merxus AI number', () => {
  assert.deepEqual(
    resolveRealEstateCompanyPhones(
      { phoneNumber: '(661) 555-1212', twilioPhoneNumber: '+18054396581' },
      { phonePrimary: '(661) 555-3434', twilioPhoneNumber: '+16617660496' },
    ),
    {
      businessPhone: '(661) 555-3434',
      merxusAiPhone: '+16617660496',
    },
  );
});

test('does not present an assigned Merxus AI number as a business phone', () => {
  assert.deepEqual(
    resolveRealEstateCompanyPhones({}, { twilioPhoneNumber: '+16614664298' }),
    {
      businessPhone: '',
      merxusAiPhone: '+16614664298',
    },
  );
});

