const ATTRIBUTION_KEY = 'merxus.metaAttribution';
const LEAD_EVENT_KEY_PREFIX = 'merxus.metaLeadEvent.';
const META_PIXEL_STATUS_KEY = '__MERXUS_META_PIXEL_STATUS__';

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'adVariant',
];

function canUseWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getConfiguredMetaPixelId() {
  return String(
    import.meta.env?.VITE_META_PIXEL_ID ||
    import.meta.env?.VITE_META_PIXELS_ID ||
    import.meta.env?.VITE_META_DATASET_ID ||
    ''
  ).trim();
}

function getMetaPixelStatus() {
  if (!canUseWindow()) return null;
  if (!window[META_PIXEL_STATUS_KEY]) {
    window[META_PIXEL_STATUS_KEY] = {
      configuredPixelId: getConfiguredMetaPixelId(),
      initialized: false,
      scriptInjected: false,
      lastError: '',
      events: [],
    };
  }
  return window[META_PIXEL_STATUS_KEY];
}

function recordMetaPixelStatus(update = {}) {
  const status = getMetaPixelStatus();
  if (!status) return null;
  Object.assign(status, update, {
    configuredPixelId: getConfiguredMetaPixelId(),
    updatedAt: new Date().toISOString(),
  });
  return status;
}

function recordMetaPixelEvent(kind, name, parameters = {}, options = {}, fired = false, reason = '') {
  const status = getMetaPixelStatus();
  if (!status) return;
  status.events.push({
    kind,
    name,
    parameters,
    options,
    fired,
    reason,
    timestamp: new Date().toISOString(),
  });
  status.events = status.events.slice(-25);
}

export function collectCampaignAttribution({ href, search, referrer } = {}) {
  const sourceHref = href || (canUseWindow() ? window.location.href : '');
  const sourceSearch = search || (sourceHref ? new URL(sourceHref).search : '');
  const params = new URLSearchParams(sourceSearch);
  const attribution = {
    landingPageUrl: sourceHref,
    referrer: referrer ?? (canUseWindow() ? document.referrer : ''),
    timestamp: new Date().toISOString(),
  };

  TRACKING_PARAMS.forEach((key) => {
    const value = params.get(key);
    if (value) attribution[key] = value;
  });

  return attribution;
}

export function persistCampaignAttribution() {
  if (!canUseWindow()) return {};
  const current = collectCampaignAttribution();
  const hasTrackingValue = TRACKING_PARAMS.some((key) => current[key]);
  const stored = getCampaignAttribution();
  const next = hasTrackingValue ? { ...stored, ...current } : { ...current, ...stored };
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

export function getCampaignAttribution() {
  if (!canUseWindow()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function initMetaPixel(pixelId = getConfiguredMetaPixelId()) {
  if (!canUseWindow()) return false;

  const normalizedPixelId = String(pixelId || '').trim();
  recordMetaPixelStatus({
    requestedPixelId: normalizedPixelId,
    fbqPresentBeforeInit: Boolean(window.fbq),
  });

  if (!normalizedPixelId) {
    recordMetaPixelStatus({
      initialized: false,
      lastError: 'Missing VITE_META_PIXEL_ID. Vite env vars are build-time values, so redeploy after setting it.',
    });
    return false;
  }

  if (window.fbq) {
    window.fbq('init', normalizedPixelId);
    recordMetaPixelStatus({
      initialized: true,
      pixelId: normalizedPixelId,
      fbqPresentAfterInit: true,
      lastError: '',
    });
    return true;
  }

  /* eslint-disable */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', normalizedPixelId);
  recordMetaPixelStatus({
    initialized: true,
    scriptInjected: true,
    pixelId: normalizedPixelId,
    fbqPresentAfterInit: Boolean(window.fbq),
    lastError: '',
  });
  return true;
}

export function trackMetaEvent(name, parameters = {}, options = {}) {
  if (!canUseWindow() || !name) return false;
  if (!window.fbq && !initMetaPixel()) {
    recordMetaPixelEvent('track', name, parameters, options, false, 'fbq_unavailable');
    return false;
  }
  const eventOptions = options.eventID ? { eventID: options.eventID } : undefined;
  window.fbq('track', name, parameters, eventOptions);
  recordMetaPixelEvent('track', name, parameters, eventOptions, true);
  return true;
}

export function trackMetaCustomEvent(name, parameters = {}, options = {}) {
  if (!canUseWindow() || !name) return false;
  if (!window.fbq && !initMetaPixel()) {
    recordMetaPixelEvent('trackCustom', name, parameters, options, false, 'fbq_unavailable');
    return false;
  }
  const eventOptions = options.eventID ? { eventID: options.eventID } : undefined;
  window.fbq('trackCustom', name, parameters, eventOptions);
  recordMetaPixelEvent('trackCustom', name, parameters, eventOptions, true);
  return true;
}

export function trackMetaLeadOnce(key, parameters = {}) {
  if (!canUseWindow()) return false;
  const safeKey = String(key || '').trim() || 'default';
  const storageKey = `${LEAD_EVENT_KEY_PREFIX}${safeKey}`;
  if (window.sessionStorage.getItem(storageKey)) return false;
  window.sessionStorage.setItem(storageKey, 'true');
  return trackMetaEvent('Lead', parameters, { eventID: `lead_${safeKey}` });
}
