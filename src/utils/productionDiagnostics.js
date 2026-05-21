const DIAGNOSTIC_BUFFER_LIMIT = 80;
const DIAGNOSTIC_FLAG = 'merxusDiagnostics';

function diagnosticsEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has('debug') ||
    params.has('diag') ||
    window.localStorage?.getItem(DIAGNOSTIC_FLAG) === 'true'
  );
}

function pushDiagnostic(event) {
  if (typeof window === 'undefined') return;

  const entry = {
    at: new Date().toISOString(),
    path: window.location.pathname,
    href: window.location.href,
    referrer: document.referrer || null,
    ...event,
  };

  window.__MERXUS_DIAGNOSTICS__ = window.__MERXUS_DIAGNOSTICS__ || [];
  window.__MERXUS_DIAGNOSTICS__.push(entry);
  if (window.__MERXUS_DIAGNOSTICS__.length > DIAGNOSTIC_BUFFER_LIMIT) {
    window.__MERXUS_DIAGNOSTICS__.shift();
  }

  if (diagnosticsEnabled()) {
    console.info('[merxus:diagnostics]', entry);
  }
}

export function markDiagnostic(event, detail = {}) {
  pushDiagnostic({ event, ...detail });
}

export function installProductionDiagnostics() {
  if (typeof window === 'undefined' || window.__MERXUS_DIAGNOSTICS_INSTALLED__) return;
  window.__MERXUS_DIAGNOSTICS_INSTALLED__ = true;
  window.__MERXUS_DIAGNOSTICS_STARTED_AT__ = performance.now();

  markDiagnostic('bootstrap:start', {
    userAgent: navigator.userAgent,
    host: window.location.host,
    protocol: window.location.protocol,
  });

  window.addEventListener('error', (event) => {
    const target = event.target;
    markDiagnostic('runtime:error', {
      message: event.message || null,
      filename: event.filename || null,
      lineno: event.lineno || null,
      colno: event.colno || null,
      assetTag: target?.tagName || null,
      assetUrl: target?.src || target?.href || null,
    });
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    markDiagnostic('runtime:unhandledrejection', {
      reason: String(event.reason?.message || event.reason || 'unknown'),
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    markDiagnostic('dom:content-loaded', {
      elapsedMs: Math.round(performance.now() - window.__MERXUS_DIAGNOSTICS_STARTED_AT__),
    });
  });

  window.addEventListener('load', () => {
    markDiagnostic('window:load', {
      elapsedMs: Math.round(performance.now() - window.__MERXUS_DIAGNOSTICS_STARTED_AT__),
    });
  });
}
