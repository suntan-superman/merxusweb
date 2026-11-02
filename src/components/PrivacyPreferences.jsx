import { useEffect, useState } from 'react';
import {
  clearAdvertisingIdentifiersForDeniedConsent,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '../utils/advertisingAttribution';

export default function PrivacyPreferences() {
  const [consent, setConsent] = useState(() => getAnalyticsConsent());
  const [open, setOpen] = useState(() => consent.analytics === 'unknown' && consent.advertising === 'unknown');

  useEffect(() => {
    const refresh = (event) => setConsent(event.detail || getAnalyticsConsent());
    window.addEventListener('merxus:consent-changed', refresh);
    return () => window.removeEventListener('merxus:consent-changed', refresh);
  }, []);

  function choose(advertising) {
    const next = setAnalyticsConsent({ analytics: 'granted', advertising });
    if (next.advertising !== 'granted') clearAdvertisingIdentifiersForDeniedConsent();
    setConsent(next);
    setOpen(false);
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 70, padding: '8px 12px', borderRadius: 999, border: '1px solid #64748b', background: '#0f172a', color: '#fff', fontSize: 12 }}>Privacy choices</button>;
  }

  return <section role="dialog" aria-label="Analytics and advertising privacy choices" style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 80, maxWidth: 720, margin: '0 auto', padding: 18, borderRadius: 16, background: '#0f172a', color: '#fff', boxShadow: '0 18px 60px rgba(0,0,0,.35)' }}>
    <strong>Privacy choices</strong>
    <p style={{ margin: '8px 0 14px', color: '#cbd5e1' }}>Merxus uses first-party analytics to understand registration and subscriptions. Advertising identifiers are stored only with your permission. Global Privacy Control is honored.</p>
    {consent.gpc ? <p style={{ color: '#93c5fd' }}>Global Privacy Control is enabled, so advertising tracking remains off.</p> : null}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <button type="button" onClick={() => choose('denied')} style={{ padding: '9px 14px' }}>Essential analytics only</button>
      <button type="button" disabled={consent.gpc} onClick={() => choose('granted')} style={{ padding: '9px 14px' }}>Allow analytics and advertising</button>
    </div>
  </section>;
}

