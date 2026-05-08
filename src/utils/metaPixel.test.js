import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectCampaignAttribution,
  initMetaPixel,
  trackMetaEvent,
} from './metaPixel.js';

test('collectCampaignAttribution extracts paid social params', () => {
  const attribution = collectCampaignAttribution({
    href: 'https://merxusllc.com/office-ai-front-desk?utm_source=meta&utm_medium=paid_social&utm_campaign=Office&utm_content=AdA&utm_term=Owners&fbclid=abc123&adVariant=office-a',
    referrer: 'https://facebook.com/',
  });

  assert.equal(attribution.utm_source, 'meta');
  assert.equal(attribution.utm_medium, 'paid_social');
  assert.equal(attribution.utm_campaign, 'Office');
  assert.equal(attribution.utm_content, 'AdA');
  assert.equal(attribution.utm_term, 'Owners');
  assert.equal(attribution.fbclid, 'abc123');
  assert.equal(attribution.adVariant, 'office-a');
  assert.equal(attribution.landingPageUrl.includes('merxusllc.com'), true);
  assert.equal(attribution.referrer, 'https://facebook.com/');
});

test('collectCampaignAttribution keeps landing metadata without utms', () => {
  const attribution = collectCampaignAttribution({
    href: 'https://merxusllc.com/restaurant-ai',
    referrer: '',
  });

  assert.equal(attribution.landingPageUrl, 'https://merxusllc.com/restaurant-ai');
  assert.equal(attribution.referrer, '');
  assert.equal(attribution.utm_source, undefined);
  assert.ok(attribution.timestamp);
});

test('initMetaPixel injects Meta script and records tracked events', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const insertedScripts = [];

  const parentNode = {
    insertBefore(node) {
      insertedScripts.push(node);
    },
  };

  globalThis.window = {
    location: { href: 'https://merxusllc.com/office-ai-front-desk' },
    localStorage: { getItem: () => null, setItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {} },
  };
  globalThis.document = {
    referrer: '',
    createElement(tagName) {
      return { tagName };
    },
    getElementsByTagName() {
      return [{ parentNode }];
    },
  };

  try {
    assert.equal(initMetaPixel('937938119035288'), true);
    assert.equal(insertedScripts.length, 1);
    assert.equal(insertedScripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');

    assert.equal(trackMetaEvent('PageView', { path: '/office-ai-front-desk' }), true);
    assert.equal(window.__MERXUS_META_PIXEL_STATUS__.pixelId, '937938119035288');
    assert.equal(window.__MERXUS_META_PIXEL_STATUS__.initialized, true);
    assert.equal(
      window.__MERXUS_META_PIXEL_STATUS__.events.some((event) => event.name === 'PageView' && event.fired),
      true
    );
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
