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
  baseUrl: process.env.MERXUS_RELEASE_BASE_URL || "https://merxus.ai",
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
    requiredEvents: ["PageView", "ViewContent", "MerxusChatOpened"],
    payloadRules: {},
    duplicateLimit: 4,
    routes: ["/office-ai-front-desk"],
    safeActions: [
      {
        eventName: "MerxusChatOpened",
        route: "/office-ai-front-desk",
        selector: "button[aria-label='Open Merxus chat']"
      },
      {
        eventName: "MerxusOnboardingStarted",
        route: "/office-ai-front-desk",
        selector: "a[href='#lead-form']"
      }
    ],
    skippedEvents: [
      {
        eventName: "Lead",
        reason: "Skipped in automated release verification because submitting the public lead form would create a production lead."
      },
      {
        eventName: "Schedule",
        reason: "Skipped because no safe Calendly test-booking completion flow is configured."
      },
      {
        eventName: "Purchase",
        reason: "Skipped because no safe Stripe test confirmation URL/session is configured; verifier never creates charges."
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
