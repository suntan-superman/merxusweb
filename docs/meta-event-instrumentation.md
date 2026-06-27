# Merxus Meta Event Instrumentation

## Configuration

- Website Dataset / Pixel ID: `974258021755637`
- Runtime env var: `VITE_META_PIXEL_ID`
- The app does not hardcode the Pixel ID in frontend source. Netlify production should keep:

```text
VITE_META_PIXEL_ID=974258021755637
```

## Helper API

The Meta Pixel helper lives at `src/utils/metaPixel.js` and exposes:

- `initMetaPixel()`
- `trackPageView(payload?)`
- `trackViewContent(payload?)`
- `trackLead(payload?)`
- `trackSchedule(payload?)`
- `trackPurchase(payload?)`
- `trackMerxusOnboardingStarted(payload?)`
- `trackMerxusChatOpened(payload?)`

The helper reads `import.meta.env.VITE_META_PIXEL_ID`, skips tracking when the value is missing, guards duplicate initialization, and records events in `window.__MERXUS_META_PIXEL_STATUS__` / `window.__MERXUS_META_PIXEL_EVENTS__` for release verification.

## Implemented Events

| Event | Type | Trigger |
|---|---|---|
| `PageView` | Standard | Every React route change via `MetaRouteTracker` in `src/App.jsx`. |
| `ViewContent` | Standard | Product, solution, feature, homepage, and pricing routes configured in `src/App.jsx`. |
| `Lead` | Standard | Paid-social landing form submission after the public chat lead session is created. |
| `Schedule` | Standard | Demo booking flow link click. Completion tracking should be preferred if Calendly confirmation routing becomes available. |
| `MerxusOnboardingStarted` | Custom | Landing-page Start Setup clicks and direct typed onboarding routes. |
| `MerxusChatOpened` | Custom | Public website chat launcher and landing-page chat CTAs. |
| `Purchase` | Standard | Successful Stripe return/confirmation pages only. It is not fired on checkout start. |

## ViewContent Routes

- `/`
- `/office-ai-front-desk`
- `/ai-front-desk`
- `/solutions/office`
- `/real-estate-ai`
- `/solutions/real-estate`
- `/restaurant-ai`
- `/solutions/restaurant`
- `/never-miss-calls`
- `/pricing`

## Release Verification

Run:

```bash
npm run verify:release
```

The Meta verification config is in `release-test.config.js`.

Safe automated verification currently uses:

| Event | Route | Selector |
|---|---|---|
| `PageView` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='PageView']` |
| `ViewContent` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='ViewContent']` |
| `Lead` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='Lead']` |
| `Schedule` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='Schedule']` |
| `MerxusOnboardingStarted` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='MerxusOnboardingStarted']` |
| `MerxusChatOpened` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='MerxusChatOpened']` |
| `Purchase` | `/meta-event-test?test_event_code=TEST8449` | `[data-meta-event='Purchase']` |

The `/meta-event-test` route is a safe browser-only QA page. It sends Pixel events only and does not create production leads, Calendly bookings, Stripe checkout sessions, or charges.

To test manually in Meta Events Manager, open the URL Meta shows in Test Events:

```text
https://merxusllc.com/meta-event-test?test_event_code=TEST8449
```

Then click each event button. The helper persists `test_event_code` in session storage and attaches it to subsequent Pixel payloads so events appear in the Test Events panel.

## Report Output

The release report includes a Meta section with:

- Expected events
- Observed events
- Pixel ID
- Missing events
- Skipped events
- Console errors
- Failed network requests
