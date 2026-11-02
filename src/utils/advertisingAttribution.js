const ATTRIBUTION_KEY = 'merxus.advertisingAttribution.v2';
const CONSENT_KEY = 'merxus.analyticsConsent.v1';
const CONSENT_VERSION = 'merxus-consent-v1';

const CONSENT_VALUES = new Set(['granted', 'denied', 'unknown']);
const PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;
const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._~:-]*$/;

function canUseBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function clean(value, maximum, pattern = null) {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > maximum || (pattern && !pattern.test(normalized))) return null;
  return normalized;
}

function safeUrl(value) {
  const normalized = clean(value, 2000);
  if (!normalized) return null;
  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

function gpcEnabled() {
  return Boolean(canUseBrowser() && window.navigator?.globalPrivacyControl === true);
}

export function getAnalyticsConsent() {
  const fallback = {
    analytics: 'unknown',
    advertising: 'unknown',
    gpc: gpcEnabled(),
    version: CONSENT_VERSION,
    capturedAt: new Date().toISOString(),
  };
  if (!canUseBrowser()) return fallback;
  try {
    const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}');
    const consent = {
      analytics: CONSENT_VALUES.has(stored.analytics) ? stored.analytics : 'unknown',
      advertising: CONSENT_VALUES.has(stored.advertising) ? stored.advertising : 'unknown',
      gpc: gpcEnabled(),
      version: CONSENT_VERSION,
      capturedAt: !Number.isNaN(Date.parse(stored.capturedAt)) ? stored.capturedAt : fallback.capturedAt,
    };
    if (consent.gpc) consent.advertising = 'denied';
    return consent;
  } catch {
    return fallback;
  }
}

export function setAnalyticsConsent({ analytics, advertising }) {
  if (!canUseBrowser()) return getAnalyticsConsent();
  const consent = {
    analytics: CONSENT_VALUES.has(analytics) ? analytics : 'unknown',
    advertising: CONSENT_VALUES.has(advertising) ? advertising : 'unknown',
    gpc: gpcEnabled(),
    version: CONSENT_VERSION,
    capturedAt: new Date().toISOString(),
  };
  if (consent.gpc) consent.advertising = 'denied';
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('merxus:consent-changed', { detail: consent }));
  return consent;
}

export function advertisingConsentGranted() {
  const consent = getAnalyticsConsent();
  return consent.advertising === 'granted' && consent.gpc === false;
}

function providerFor(params) {
  const source = String(params.get('utm_source') || '').trim().toLowerCase();
  if (params.get('rdt_cid') || source.includes('reddit')) return 'reddit';
  if (params.get('fbclid') || ['meta', 'facebook', 'instagram'].some((value) => source.includes(value))) return 'meta';
  if (params.get('gclid') || source.includes('google')) return 'google';
  return 'organic';
}

function touchFromLocation({ href, referrer, touchedAt } = {}) {
  const landingPage = safeUrl(href || (canUseBrowser() ? window.location.href : ''));
  if (!landingPage) return null;
  const url = new URL(landingPage);
  const params = url.searchParams;
  const provider = providerFor(params);
  const advertisingAllowed = advertisingConsentGranted();
  const touch = {
    provider,
    utmSource: clean(params.get('utm_source'), 200),
    utmMedium: clean(params.get('utm_medium'), 200),
    utmCampaign: clean(params.get('utm_campaign'), 300),
    utmContent: clean(params.get('utm_content'), 300),
    utmTerm: clean(params.get('utm_term'), 300),
    touchedAt: !Number.isNaN(Date.parse(touchedAt)) ? touchedAt : new Date().toISOString(),
    referrer: safeUrl(referrer ?? (canUseBrowser() ? document.referrer : '')),
    landingPage,
  };
  if (advertisingAllowed) {
    if (provider === 'reddit') touch.redditClickId = clean(params.get('rdt_cid'), 500, PROVIDER_ID);
    if (provider === 'meta') touch.metaClickId = clean(params.get('fbclid'), 500, PROVIDER_ID);
    if (provider === 'google') touch.googleClickId = clean(params.get('gclid'), 500, PROVIDER_ID);
    if (provider !== 'organic') {
      touch.campaignId = clean(params.get('campaign_id') || params.get('utm_id'), 200, ENTITY_ID);
      touch.adGroupId = clean(params.get('adgroup_id') || params.get('adset_id'), 200, ENTITY_ID);
      touch.adId = clean(params.get('ad_id'), 200, ENTITY_ID);
    }
  }
  return Object.fromEntries(Object.entries(touch).filter(([, value]) => value !== null && value !== ''));
}

export function getAdvertisingAttribution() {
  const empty = { firstTouch: null, latestTouch: null, consent: getAnalyticsConsent() };
  if (!canUseBrowser()) return empty;
  try {
    const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}');
    return {
      firstTouch: stored.firstTouch && typeof stored.firstTouch === 'object' ? stored.firstTouch : null,
      latestTouch: stored.latestTouch && typeof stored.latestTouch === 'object' ? stored.latestTouch : null,
      consent: getAnalyticsConsent(),
    };
  } catch {
    return empty;
  }
}

export function persistAdvertisingAttribution(options = {}) {
  if (!canUseBrowser()) return getAdvertisingAttribution();
  const current = getAdvertisingAttribution();
  const touch = touchFromLocation(options);
  if (!touch) return current;
  const hasCampaignSignal = Boolean(
    touch.utmSource || touch.utmMedium || touch.utmCampaign ||
    touch.redditClickId || touch.metaClickId || touch.googleClickId
  );
  const paidExisting = current.latestTouch && current.latestTouch.provider !== 'organic';
  const shouldUpdateLatest = hasCampaignSignal || !paidExisting;
  const next = {
    firstTouch: current.firstTouch || touch,
    latestTouch: shouldUpdateLatest ? touch : current.latestTouch,
    consent: getAnalyticsConsent(),
  };
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

export function clearAdvertisingIdentifiersForDeniedConsent() {
  if (!canUseBrowser()) return getAdvertisingAttribution();
  const current = getAdvertisingAttribution();
  const strip = (touch) => touch ? Object.fromEntries(Object.entries(touch).filter(([key]) => ![
    'redditClickId', 'metaClickId', 'googleClickId', 'campaignId', 'adGroupId', 'adId',
  ].includes(key))) : null;
  const next = { firstTouch: strip(current.firstTouch), latestTouch: strip(current.latestTouch), consent: getAnalyticsConsent() };
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

