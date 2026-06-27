# Merxus AI Release Verification Summary

Status: PASS_WITH_WARNINGS
Certification: CERTIFIED WITH WARNINGS
Date: 2026-06-27T15:55:08.971Z
Target: production
Branch: main
Commit: 2d5c01efa2492c09a00495de286de5224baf4d9e

| Area | Status | Policy |
|---|---|---|
| Environment | SKIPPED | Blocking |
| Build | SKIPPED | Warning |
| Lint | SKIPPED | Warning |
| Browser Smoke | SKIPPED | Blocking |
| SEO | SKIPPED | Warning |
| Broken Links | SKIPPED | Warning |
| Meta Pixel | PASS | Warning |
| Stripe Guardrails | SKIPPED | Warning |
| Authentication | SKIPPED | Warning |
| Lighthouse | SKIPPED | Warning |

## Meta Pixel

Pixel ID: [REDACTED_PHONE]55637
fbq loaded: yes
Expected events: PageView, ViewContent, Lead, Schedule, MerxusOnboardingStarted, MerxusChatOpened, Purchase
Observed events: PageView, ViewContent, MerxusChatOpened, MerxusOnboardingStarted
Missing events: none
Skipped events: Lead: Skipped in automated release verification because submitting the public lead form would create a production lead.; Schedule: Skipped because no safe Calendly test-booking completion flow is configured.; Purchase: Skipped because no safe Stripe test confirmation URL/session is configured; verifier never creates charges.
Console errors: 0
Failed network requests: 0

## Next Action

Safe to continue manual review. Do not enable hard release gate until warning checks are stable.
