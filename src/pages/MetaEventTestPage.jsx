import { useMemo, useState } from 'react';
import {
  getCampaignAttribution,
  getConfiguredMetaPixelId,
  initMetaPixel,
  trackLead,
  trackMerxusChatOpened,
  trackMerxusOnboardingStarted,
  trackPageView,
  trackPurchase,
  trackSchedule,
  trackViewContent,
} from '../utils/metaPixel';

const TEST_EVENTS = [
  {
    eventName: 'PageView',
    description: 'Standard route/page load event.',
    action: () => trackPageView({
      page_path: window.location.pathname,
      path: window.location.pathname,
      source: 'manual_meta_test',
    }),
  },
  {
    eventName: 'ViewContent',
    description: 'Solution/content view event.',
    action: () => trackViewContent({
      content_name: 'Merxus Meta Test Content',
      content_category: 'meta_test',
      page_path: window.location.pathname,
      source: 'manual_meta_test',
    }),
  },
  {
    eventName: 'Lead',
    description: 'Safe browser-only test lead. No lead is submitted.',
    action: () => trackLead({
      content_name: 'Merxus Demo Lead',
      lead_type: 'meta_test',
      page_path: window.location.pathname,
      source: 'manual_meta_test',
    }, { dedupeKey: `manual-meta-test-lead-${Date.now()}` }),
  },
  {
    eventName: 'Schedule',
    description: 'Safe browser-only schedule test. No Calendly booking is created.',
    action: () => trackSchedule({
      content_name: 'Merxus Demo Scheduled',
      page_path: window.location.pathname,
      source: 'manual_meta_test',
    }, { dedupeKey: `manual-meta-test-schedule-${Date.now()}` }),
  },
  {
    eventName: 'MerxusOnboardingStarted',
    description: 'Custom onboarding-start event.',
    action: () => trackMerxusOnboardingStarted({
      content_name: 'Merxus Onboarding Started',
      page_path: window.location.pathname,
      source: 'manual_meta_test',
    }),
  },
  {
    eventName: 'MerxusChatOpened',
    description: 'Custom chat-open event.',
    action: () => trackMerxusChatOpened({
      content_name: 'Merxus Website Assistant',
      page_path: window.location.pathname,
      source: 'manual_meta_test',
    }),
  },
  {
    eventName: 'Purchase',
    description: 'Safe browser-only purchase test. No Stripe session or charge is created.',
    action: () => trackPurchase({
      content_name: 'Merxus Subscription',
      currency: 'USD',
      value: 1,
      page_path: window.location.pathname,
      source: 'manual_meta_test',
    }, { dedupeKey: `manual-meta-test-purchase-${Date.now()}` }),
  },
];

export default function MetaEventTestPage() {
  const attribution = useMemo(() => getCampaignAttribution(), []);
  const [events, setEvents] = useState([]);
  const pixelId = getConfiguredMetaPixelId();
  const testEventCode = attribution.test_event_code || '';

  function fireEvent(testEvent) {
    initMetaPixel();
    const fired = testEvent.action();
    setEvents((current) => [
      {
        eventName: testEvent.eventName,
        fired,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...current,
    ].slice(0, 12));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Merxus QA</p>
          <h1 className="mt-2 text-3xl font-bold">Meta Pixel Event Test</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            This page fires browser-only Meta Pixel test events. It does not create production leads, Calendly bookings, Stripe checkout sessions, or charges.
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-slate-400">Pixel ID</span>
              <strong className="mt-1 block">{pixelId || 'Missing VITE_META_PIXEL_ID'}</strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-slate-400">Test Event Code</span>
              <strong className="mt-1 block">{testEventCode || 'Add ?test_event_code=TEST#### to the URL'}</strong>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {TEST_EVENTS.map((testEvent) => (
              <button
                key={testEvent.eventName}
                type="button"
                data-meta-event={testEvent.eventName}
                onClick={() => fireEvent(testEvent)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left transition hover:border-emerald-400 hover:bg-slate-800/70"
              >
                <span className="block text-base font-semibold">{testEvent.eventName}</span>
                <span className="mt-1 block text-sm text-slate-300">{testEvent.description}</span>
              </button>
            ))}
          </div>

          {events.length ? (
            <section className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h2 className="text-lg font-semibold">Local Fire Log</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {events.map((event, index) => (
                  <li key={`${event.eventName}-${event.timestamp}-${index}`} className="flex justify-between gap-4">
                    <span>{event.eventName}</span>
                    <span>{event.fired ? 'fired' : 'blocked'} at {event.timestamp}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
