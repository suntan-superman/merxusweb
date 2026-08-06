import assert from 'node:assert/strict';
import test from 'node:test';
import { formatListingDetails } from './listingPresentation.js';

test('formats imported listing fields in the listings table', () => {
  assert.equal(
    formatListingDetails({
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1650,
      zipCode: '93306',
    }),
    '3 bed • 2 bath • 1,650 sq ft • ZIP 93306',
  );
});

test('supports legacy listing field names during migration', () => {
  assert.equal(
    formatListingDetails({ beds: 4, baths: 2.5, sq_ft: 2400, zip: '93311' }),
    '4 bed • 2.5 bath • 2,400 sq ft • ZIP 93311',
  );
});

