import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAdvertisingIdentifiersForDeniedConsent,
  getAdvertisingAttribution,
  persistAdvertisingAttribution,
  setAnalyticsConsent,
} from './advertisingAttribution.js';

function browser({ gpc = false } = {}) {
  const values = new Map();
  globalThis.window = {
    location: { href: 'https://merxusllc.com/?utm_source=reddit&utm_campaign=launch&rdt_cid=reddit-123' },
    navigator: { globalPrivacyControl: gpc },
    dispatchEvent() {},
  };
  globalThis.document = { referrer: 'https://www.reddit.com/' };
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  return values;
}

test('captures consented Reddit first/latest touch and keeps first touch immutable', () => {
  browser();
  setAnalyticsConsent({ analytics: 'granted', advertising: 'granted' });
  const first = persistAdvertisingAttribution();
  assert.equal(first.firstTouch.provider, 'reddit');
  assert.equal(first.firstTouch.redditClickId, 'reddit-123');

  window.location.href = 'https://merxusllc.com/?utm_source=google&utm_campaign=second&gclid=google-456';
  const second = persistAdvertisingAttribution();
  assert.equal(second.firstTouch.redditClickId, 'reddit-123');
  assert.equal(second.latestTouch.provider, 'google');
  assert.equal(second.latestTouch.googleClickId, 'google-456');
});

test('direct navigation does not overwrite a paid latest touch', () => {
  browser();
  setAnalyticsConsent({ analytics: 'granted', advertising: 'granted' });
  persistAdvertisingAttribution();
  window.location.href = 'https://merxusllc.com/pricing';
  const attribution = persistAdvertisingAttribution();
  assert.equal(attribution.latestTouch.provider, 'reddit');
});

test('GPC and denied consent prevent provider identifier persistence', () => {
  browser({ gpc: true });
  setAnalyticsConsent({ analytics: 'granted', advertising: 'granted' });
  const attribution = persistAdvertisingAttribution();
  assert.equal(attribution.consent.gpc, true);
  assert.equal(attribution.consent.advertising, 'denied');
  assert.equal(attribution.firstTouch.redditClickId, undefined);
  assert.equal(getAdvertisingAttribution().firstTouch.utmCampaign, 'launch');
});

test('revoking consent removes already stored advertising identifiers', () => {
  browser();
  setAnalyticsConsent({ analytics: 'granted', advertising: 'granted' });
  persistAdvertisingAttribution();
  setAnalyticsConsent({ analytics: 'granted', advertising: 'denied' });
  const stripped = clearAdvertisingIdentifiersForDeniedConsent();
  assert.equal(stripped.firstTouch.redditClickId, undefined);
});

