import { getIdToken } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getMerxusAppCheckToken } from '../firebase/appCheck';
import { getCampaignAttribution } from './metaPixel';

const VISITOR_KEY = 'merxus.worksideAnalytics.visitor.v1';
const QUEUE_KEY = 'merxus.worksideAnalytics.queue.v1';
const MAX_QUEUE_SIZE = 100;

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

function endpoint() {
  return String(import.meta.env?.VITE_WORKSIDE_ANALYTICS_ENDPOINT || '').trim().replace(/\/$/, '');
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

function readQueue() {
  if (!canUseWindow()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (!canUseWindow()) return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
}

function enqueue(payload) {
  writeQueue([...readQueue(), { payload, createdAt: Date.now() }]);
}

async function authToken() {
  const currentUser = auth.currentUser;
  return currentUser ? getIdToken(currentUser, false) : null;
}

async function send(payload) {
  const url = endpoint();
  if (!url) return { disabled: true };
  const [bearer, appCheckToken] = await Promise.all([
    authToken(),
    getMerxusAppCheckToken().catch(() => null),
  ]);
  const response = await fetch(`${url}/api/events`, {
    method: 'POST',
    keepalive: true,
    headers: compact({
      'Content-Type': 'application/json',
      Authorization: bearer ? `Bearer ${bearer}` : null,
      'X-Firebase-AppCheck': appCheckToken,
    }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Workside Analytics rejected event with ${response.status}`);
  return response.json();
}

export async function trackWorksideAnalyticsEvent(eventName, properties = {}, options = {}) {
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
  const queue = readQueue();
  const remaining = [];
  let sent = 0;
  for (const item of queue) {
    try {
      await send(item.payload);
      sent += 1;
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { sent, remaining: remaining.length };
}
