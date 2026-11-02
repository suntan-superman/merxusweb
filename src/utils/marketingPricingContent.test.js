import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('homepage states the production trial and billing terms', async () => {
  const homeSource = await readSource('../pages/Home.jsx');

  assert.match(homeSource, /30-day subscription trial/);
  assert.match(homeSource, /one-time setup fee is charged at checkout/);
  assert.match(homeSource, /monthly billing begins automatically after the trial unless canceled/);
  assert.doesNotMatch(homeSource, /14 days/i);
});

test('pricing failure UI offers a manual retry and keeps pricing API-backed', async () => {
  const pricingSource = await readSource('../pages/Pricing.jsx');

  assert.match(pricingSource, /fetchPricingWithRetry\(getBillingPricing\)/);
  assert.match(pricingSource, /onClick=\{loadPricing\}/);
  assert.match(pricingSource, /Retry pricing/);
  assert.doesNotMatch(pricingSource, /fallbackPrice|fallbackPlans|hardcodedPrice/);
});
