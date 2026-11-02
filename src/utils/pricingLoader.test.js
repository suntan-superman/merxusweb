import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPricingWithRetry } from './pricingLoader.js';

test('pricing loader returns the dynamic response without retrying a successful request', async () => {
  const livePricing = { trialDays: 30, displayPlans: { office: [{ id: 'live-plan' }] } };
  let attempts = 0;

  const result = await fetchPricingWithRetry(async () => {
    attempts += 1;
    return livePricing;
  }, { waitForRetry: async () => {} });

  assert.equal(result, livePricing);
  assert.equal(attempts, 1);
});

test('pricing loader retries one transient failure and returns the dynamic response', async () => {
  const livePricing = { trialDays: 30, displayPlans: { restaurant: [{ id: 'live-plan' }] } };
  let attempts = 0;
  let waits = 0;

  const result = await fetchPricingWithRetry(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary failure');
    return livePricing;
  }, {
    retryDelayMs: 1,
    waitForRetry: async () => { waits += 1; },
  });

  assert.equal(result, livePricing);
  assert.equal(attempts, 2);
  assert.equal(waits, 1);
});

test('pricing loader stops after two failed attempts and does not invent fallback pricing', async () => {
  const failure = new Error('pricing unavailable');
  let attempts = 0;

  await assert.rejects(
    fetchPricingWithRetry(async () => {
      attempts += 1;
      throw failure;
    }, { waitForRetry: async () => {} }),
    (error) => error === failure,
  );

  assert.equal(attempts, 2);
});
