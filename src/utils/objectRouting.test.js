import test from 'node:test';
import assert from 'node:assert/strict';

import { getNativeObjectRoute, getPortalBasePath } from './objectRouting.js';

test('portal base path helper maps supported tenant types', () => {
  assert.equal(getPortalBasePath('restaurant'), '/restaurant');
  assert.equal(getPortalBasePath('real_estate'), '/estate');
  assert.equal(getPortalBasePath('voice'), '/voice');
  assert.equal(getPortalBasePath('unsupported'), '');
});

test('native object routing resolves tenant-specific record drilldowns', () => {
  assert.deepEqual(
    getNativeObjectRoute('restaurant', { reservationId: 'res 42' }),
    {
      label: 'Open Reservation Record',
      path: '/restaurant/reservations?reservationId=res%2042',
    },
  );
  assert.deepEqual(
    getNativeObjectRoute('real_estate', { propertyId: 'listing/abc' }),
    {
      label: 'Open Listing Record',
      path: '/estate/listings/listing%2Fabc',
    },
  );
  assert.deepEqual(
    getNativeObjectRoute('voice', { serviceRequestId: 'svc-1' }),
    {
      label: 'Open Service Request',
      path: '/voice/work-items?type=service_request&id=svc-1',
    },
  );
  assert.equal(getNativeObjectRoute('voice', {}), null);
  assert.equal(getNativeObjectRoute('unsupported', { orderId: '1' }), null);
});
