# Merxus AI Release Verification Summary

Status: PASS_WITH_WARNINGS
Certification: CERTIFIED WITH WARNINGS
Date: 2026-06-27T16:02:08.827Z
Target: local
Branch: main
Commit: 9cb7d0d30419bfcd076819558b3080ec2668178a

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
Observed events: PageView, ViewContent, Lead, Schedule, MerxusOnboardingStarted, MerxusChatOpened, Purchase
Missing events: none
Skipped events: none
Console errors: 0
Failed network requests: 0

## Next Action

Safe to continue manual review. Do not enable hard release gate until warning checks are stable.
