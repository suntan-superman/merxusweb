import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

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
        'error-callback': () => {
          if (!cancelled) onError?.();
        },
      });
    };

    if (window.turnstile) {
      render();
      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current !== null) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerify, onExpire, onError, theme]);

  return <div ref={containerRef} />;
}
