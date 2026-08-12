import { apiClient } from '../api/client';
import { getMerxusAppCheckToken } from '../firebase/appCheck';
import { getCampaignAttribution } from './metaPixel';

const VISITOR_KEY = 'merxus.worksideAnalytics.visitor.v1';
const QUEUE_KEY = 'merxus.worksideAnalytics.queue.v1';
const MAX_QUEUE_SIZE = 100;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function canUseWindow() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null && value !== undefined && value !== ''));
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function analyticsEnabled() {
  const explicit = String(import.meta.env?.VITE_WORKSIDE_ANALYTICS_ENABLED || '').trim().toLowerCase();
  if (explicit) return ['1', 'true', 'yes', 'on'].includes(explicit);

  // Backward compatibility for existing Netlify builds. The legacy endpoint is
  // now only an enablement signal; events are never sent to it from the browser.
  return Boolean(String(import.meta.env?.VITE_WORKSIDE_ANALYTICS_ENDPOINT || '').trim());
}

function environment() {
  const value = String(import.meta.env?.VITE_WORKSIDE_ANALYTICS_ENV || import.meta.env?.MODE || 'production').trim();
  return ['development', 'test', 'staging', 'production'].includes(value) ? value : 'production';
}

function anonymousId() {
  if (!canUseWindow()) return uuid();
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function attribution() {
  const source = getCampaignAttribution();
  return compact({
    utmSource: source.utm_source,
    utmMedium: source.utm_medium,
    utmCampaign: source.utm_campaign,
    utmContent: source.utm_content,
    utmTerm: source.utm_term,
    metaClickId: source.fbclid,
    googleClickId: source.gclid,
    referrer: source.referrer,
    landingPage: source.landingPageUrl,
  });
}

function readQueue(now = Date.now()) {
  if (!canUseWindow()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item) => (
          item?.payload?.eventId && now - Number(item.createdAt || 0) <= MAX_EVENT_AGE_MS
        ))
      : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (!canUseWindow()) return;
  const unique = [...new Map(queue.map((item) => [item.payload.eventId, item])).values()]
    .slice(-MAX_QUEUE_SIZE);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(unique));
}

function enqueue(payload, attempts = 0) {
  const currentTime = Date.now();
  writeQueue([...readQueue(currentTime), {
    payload,
    attempts,
    createdAt: currentTime,
    nextAttemptAt: currentTime + Math.min(60_000, 1000 * (2 ** attempts)),
  }]);
}

async function send(payload) {
  if (!analyticsEnabled()) return { disabled: true };
  const appCheckToken = await getMerxusAppCheckToken().catch(() => null);
  const response = await apiClient.post('/analytics/events', payload, {
    headers: compact({
      'X-Firebase-AppCheck': appCheckToken,
      'X-Suppress-Error-Log': 'true',
    }),
  });
  return response.data;
}

export async function trackWorksideAnalyticsEvent(eventName, properties = {}, options = {}) {
  if (!analyticsEnabled()) return { disabled: true };
  const payload = {
    eventId: options.eventId || uuid(),
    eventName,
    productId: 'merxus',
    occurredAt: options.occurredAt || new Date().toISOString(),
    anonymousId: anonymousId(),
    userId: null,
    sessionId: options.sessionId || properties.sessionId || null,
    platform: 'web',
    environment: environment(),
    source: 'web',
    page: options.page || (canUseWindow() ? window.location.href : null),
    screen: null,
    properties,
    attribution: attribution(),
    appVersion: import.meta.env?.VITE_APP_VERSION || null,
    schemaVersion: 1,
  };
  try {
    return await send(payload);
  } catch (error) {
    enqueue(payload);
    return { queued: true, eventId: payload.eventId };
  }
}

export async function flushWorksideAnalyticsQueue() {
  if (!analyticsEnabled()) return { disabled: true };
  const currentTime = Date.now();
  const queue = readQueue(currentTime);
  const remaining = [];
  let sent = 0;
  for (const item of queue) {
    if (Number(item.nextAttemptAt || 0) > currentTime) {
      remaining.push(item);
      continue;
    }
    try {
      await send(item.payload);
      sent += 1;
    } catch {
      const attempts = Number(item.attempts || 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.push({
          ...item,
          attempts,
          nextAttemptAt: currentTime + Math.min(60_000, 1000 * (2 ** attempts)),
        });
      }
    }
  }
  writeQueue(remaining);
  return { sent, remaining: remaining.length };
}
