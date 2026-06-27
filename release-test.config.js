import { fileURLToPath } from "node:url";

const EXPECTED_META_PIXEL_ID = process.env.VITE_META_PIXEL_ID || process.env.MERXUS_META_PIXEL_ID || "974258021755637";
const EXPECTED_META_EVENTS = [
  "PageView",
  "ViewContent",
  "Lead",
  "Schedule",
  "MerxusOnboardingStarted",
  "MerxusChatOpened",
  "Purchase"
];

export default {
  productName: "Merxus AI",
  productSlug: "merxus",
  reportProductKey: "Merxus",
  appRoot: fileURLToPath(new URL(".", import.meta.url)),
  baseUrl: process.env.MERXUS_RELEASE_BASE_URL || "https://merxusllc.com",
  localUrl: "http://localhost:3000",
  environment: process.env.RELEASE_TEST_TARGET || "production",
  app: {
    type: "web",
    framework: "react-vite"
  },
  checks: {
    env: { enabled: true, blocking: true },
    browser: { enabled: true, blocking: true },
    routes: { enabled: true, blocking: true },
    auth: { enabled: true, blocking: false },
    stripe: { enabled: true, blocking: false },
    meta: { enabled: true, blocking: false },
    seo: { enabled: true, blocking: false },
    lighthouse: { enabled: false, blocking: false },
    links: { enabled: false, blocking: false }
  },
  requiredEnv: [],
  routes: ["/", "/login", "/dashboard", "/privacy-policy"],
  expectedMetaPixelId: EXPECTED_META_PIXEL_ID,
  expectedMetaEvents: EXPECTED_META_EVENTS,
  meta: {
    enabled: true,
    pixelIdEnv: "VITE_META_PIXEL_ID",
    expectedPixelId: EXPECTED_META_PIXEL_ID,
    expectedEvents: EXPECTED_META_EVENTS,
    requiredEvents: EXPECTED_META_EVENTS,
    payloadRules: {},
    duplicateLimit: 4,
    routes: ["/meta-event-test?test_event_code=TEST8449"],
    safeActions: [
      {
        eventName: "PageView",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='PageView']"
      },
      {
        eventName: "ViewContent",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='ViewContent']"
      },
      {
        eventName: "Lead",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='Lead']"
      },
      {
        eventName: "Schedule",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='Schedule']"
      },
      {
        eventName: "MerxusOnboardingStarted",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='MerxusOnboardingStarted']"
      },
      {
        eventName: "MerxusChatOpened",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='MerxusChatOpened']"
      },
      {
        eventName: "Purchase",
        route: "/meta-event-test?test_event_code=TEST8449",
        selector: "[data-meta-event='Purchase']"
      }
    ]
  },
  auth: {
    enabled: true,
    testEmail: process.env.RELEASE_TEST_EMAIL,
    testPassword: process.env.RELEASE_TEST_PASSWORD,
    loginUrl: "/login",
    dashboardUrl: "/dashboard",
    credentials: {
      emailEnv: "RELEASE_TEST_EMAIL",
      passwordEnv: "RELEASE_TEST_PASSWORD"
    },
    selectors: {}
  },
  stripe: {
    enabled: true,
    testModeOnly: true,
    requireTestMode: true,
    safeCheckoutOnly: true,
    productionCheckoutAutomation: false,
    allowRealCharges: false,
    selectors: {}
  },
  seo: {
    enabled: true,
    requiredTitle: true,
    requiredDescription: true,
    requiredCanonical: false,
    requiredOpenGraph: false,
    requiredTwitterCards: false
  },
  reporting: {
    outputDir: "./reports/Merxus",
    formats: ["json", "html", "md", "certification"],
    archive: true
  }
};
