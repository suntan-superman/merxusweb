import { lazy as reactLazy } from 'react';

const RETRY_FLAG_KEY = 'merxus.lazyImportRetryTriggered';
const RETRY_WINDOW_MS = 30 * 1000;

function isRecoverableLazyImportError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('failed to load module script') ||
    message.includes('loading chunk') ||
    message.includes('mime type')
  );
}

function forceHardNavigationReload() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('__lazy_retry', String(Date.now()));
  window.location.replace(url.toString());
}

function recentlyRetried() {
  if (typeof window === 'undefined') return true;
  const value = window.sessionStorage.getItem(RETRY_FLAG_KEY);
  const timestamp = Number(value || 0);
  return Number.isFinite(timestamp) && Date.now() - timestamp < RETRY_WINDOW_MS;
}

export default function lazyWithRetry(importer) {
  return reactLazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(RETRY_FLAG_KEY);
      }
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isRecoverableLazyImportError(error)) {
        if (!recentlyRetried()) {
          window.sessionStorage.setItem(RETRY_FLAG_KEY, String(Date.now()));
          forceHardNavigationReload();
          // Keep Suspense pending while the page reloads.
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}
