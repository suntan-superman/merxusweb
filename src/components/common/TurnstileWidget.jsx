import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (window.__turnstileLoadPromise) {
    return window.__turnstileLoadPromise;
  }

  window.__turnstileLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.body.appendChild(script);
  });

  return window.__turnstileLoadPromise;
}

export default function TurnstileWidget({ onVerify, onExpire, onError, theme = 'light' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) {
      console.error('Turnstile site key is missing');
      return undefined;
    }

    let cancelled = false;

    const render = () => {
      if (!containerRef.current || cancelled) return;
      if (!window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme,
        callback: (token) => {
          if (!cancelled) onVerify?.(token);
        },
        'expired-callback': () => {
          if (!cancelled) onExpire?.();
        },
        'error-callback': (errorCode) => {
          if (!cancelled) onError?.(errorCode);
        },
      });
    };

    loadTurnstileScript()
      .then(() => {
        render();
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(error?.message || 'Turnstile failed to load');
        }
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerify, onExpire, onError, theme]);

  return <div ref={containerRef} />;
}
