import { lazy as reactLazy } from 'react';

const RETRY_FLAG_KEY = 'merxus.lazyImportRetryTriggered';

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
        const alreadyRetried = window.sessionStorage.getItem(RETRY_FLAG_KEY) === '1';
        if (!alreadyRetried) {
          window.sessionStorage.setItem(RETRY_FLAG_KEY, '1');
          forceHardNavigationReload();
          // Keep Suspense pending while the page reloads.
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}
