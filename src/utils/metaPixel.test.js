import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectCampaignAttribution,
  initMetaPixel,
  trackMerxusChatOpened,
  trackPageView,
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
  const sessionValues = new Map();

  globalThis.window = {
    location: {
      href: 'https://merxusllc.com/office-ai-front-desk?test_event_code=TEST8449',
      pathname: '/office-ai-front-desk',
      search: '?test_event_code=TEST8449',
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    sessionStorage: {
      getItem: (key) => sessionValues.get(key) || null,
      setItem: (key, value) => sessionValues.set(key, value),
    },
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
    assert.equal(initMetaPixel('937938119035288'), true);
    assert.equal(insertedScripts.length, 1);
    assert.equal(insertedScripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');

    assert.equal(trackPageView({ path: '/office-ai-front-desk' }), true);
    assert.equal(trackMetaEvent('ViewContent', { page_path: '/office-ai-front-desk' }), true);
    assert.equal(trackMerxusChatOpened({ page_path: '/office-ai-front-desk' }), true);
    assert.equal(window.__MERXUS_META_PIXEL_STATUS__.pixelId, '937938119035288');
    assert.equal(window.__MERXUS_META_PIXEL_STATUS__.initialized, true);
    assert.equal(
      window.__MERXUS_META_PIXEL_STATUS__.events.some((event) => event.name === 'PageView' && event.fired),
      true
    );
    assert.equal(
      window.__MERXUS_META_PIXEL_STATUS__.events.some((event) => event.name === 'PageView' && event.parameters.test_event_code === 'TEST8449'),
      true
    );
    assert.equal(
      window.__MERXUS_META_PIXEL_STATUS__.events.some((event) => event.name === 'MerxusChatOpened' && event.fired),
      true
    );
    assert.equal(
      window.__MERXUS_META_PIXEL_STATUS__.initializedPixelIds.filter((id) => id === '937938119035288').length,
      1
    );
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
