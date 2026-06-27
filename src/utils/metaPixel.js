const ATTRIBUTION_KEY = 'merxus.metaAttribution';
const LEAD_EVENT_KEY_PREFIX = 'merxus.metaLeadEvent.';
const PURCHASE_EVENT_KEY_PREFIX = 'merxus.metaPurchaseEvent.';
const SCHEDULE_EVENT_KEY_PREFIX = 'merxus.metaScheduleEvent.';
const META_PIXEL_STATUS_KEY = '__MERXUS_META_PIXEL_STATUS__';
const META_PIXEL_LOG_KEY = '__MERXUS_META_PIXEL_EVENTS__';

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

function isMetaDebugEnabled() {
  return Boolean(
    import.meta.env?.DEV ||
    import.meta.env?.MODE === 'test' ||
    import.meta.env?.VITE_META_PIXEL_DEBUG === 'true'
  );
}

export function getConfiguredMetaPixelId() {
  return String(import.meta.env?.VITE_META_PIXEL_ID || '').trim();
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
      initializedPixelIds: [],
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
  const entry = {
    kind,
    name,
    parameters,
    options,
    fired,
    reason,
    timestamp: new Date().toISOString(),
    pageUrl: canUseWindow() ? window.location.href : '',
  };
  status.events.push(entry);
  status.events = status.events.slice(-25);
  window[META_PIXEL_LOG_KEY] = status.events;
  if (isMetaDebugEnabled()) {
    console.info('[Merxus Meta Pixel]', entry);
  }
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
  const status = getMetaPixelStatus();
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

  if (status?.initialized && status.pixelId === normalizedPixelId && window.fbq) {
    recordMetaPixelStatus({
      initialized: true,
      pixelId: normalizedPixelId,
      fbqPresentAfterInit: true,
      lastError: '',
    });
    return true;
  }

  if (window.fbq) {
    if (!status?.initializedPixelIds?.includes(normalizedPixelId)) {
      window.fbq('init', normalizedPixelId);
    }
    recordMetaPixelStatus({
      initialized: true,
      pixelId: normalizedPixelId,
      fbqPresentAfterInit: true,
      initializedPixelIds: [...new Set([...(status?.initializedPixelIds || []), normalizedPixelId])],
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
    initializedPixelIds: [...new Set([...(status?.initializedPixelIds || []), normalizedPixelId])],
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

export function trackPageView(parameters = {}) {
  return trackMetaEvent('PageView', parameters);
}

export function trackViewContent(parameters = {}) {
  return trackMetaEvent('ViewContent', parameters);
}

export function trackLead(parameters = {}, options = {}) {
  const key = options.dedupeKey || `${parameters.lead_type || 'lead'}:${parameters.page_path || parameters.pagePath || window.location.pathname}`;
  return trackOnce({
    storageKey: `${LEAD_EVENT_KEY_PREFIX}${key}`,
    eventName: 'Lead',
    parameters,
    options: { eventID: `lead_${safeEventId(key)}` },
  });
}

export function trackSchedule(parameters = {}, options = {}) {
  const key = options.dedupeKey || `${parameters.content_name || 'schedule'}:${parameters.page_path || parameters.pagePath || window.location.pathname}`;
  return trackOnce({
    storageKey: `${SCHEDULE_EVENT_KEY_PREFIX}${key}`,
    eventName: 'Schedule',
    parameters,
    options: { eventID: `schedule_${safeEventId(key)}` },
  });
}

export function trackPurchase(parameters = {}, options = {}) {
  const key = options.dedupeKey || parameters.session_id || parameters.sessionId || `${parameters.content_name || 'purchase'}:${parameters.page_path || parameters.pagePath || window.location.pathname}`;
  return trackOnce({
    storageKey: `${PURCHASE_EVENT_KEY_PREFIX}${key}`,
    eventName: 'Purchase',
    parameters,
    options: { eventID: `purchase_${safeEventId(key)}` },
  });
}

export function trackMerxusOnboardingStarted(parameters = {}) {
  return trackMetaCustomEvent('MerxusOnboardingStarted', parameters);
}

export function trackMerxusChatOpened(parameters = {}) {
  return trackMetaCustomEvent('MerxusChatOpened', parameters);
}

export function trackMetaLeadOnce(key, parameters = {}) {
  return trackLead(parameters, { dedupeKey: key });
}

function trackOnce({ storageKey, eventName, parameters, options }) {
  if (!canUseWindow()) return false;
  if (window.sessionStorage.getItem(storageKey)) return false;
  window.sessionStorage.setItem(storageKey, 'true');
  return trackMetaEvent(eventName, parameters, options);
}

function safeEventId(value) {
  return String(value || 'default').trim().replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'default';
}
