# Merxus AI Release Verification Summary

Status: PASS_WITH_WARNINGS
Certification: CERTIFIED WITH WARNINGS
Date: 2026-06-27T15:39:49.202Z
Target: local
Branch: main
Commit: debaecf1c509bcd667f7d56c67e7f01ae3cc0421

| Area | Status | Policy |
|---|---|---|
| Environment | SKIPPED | Blocking |
| Build | SKIPPED | Warning |
| Lint | SKIPPED | Warning |
| Browser Smoke | SKIPPED | Blocking |
| SEO | SKIPPED | Warning |
| Broken Links | SKIPPED | Warning |
| Meta Pixel | WARNING | Warning |
| Stripe Guardrails | SKIPPED | Warning |
| Authentication | SKIPPED | Warning |
| Lighthouse | SKIPPED | Warning |

## Meta Pixel

Pixel ID: [REDACTED_PHONE]55637
fbq loaded: no
Expected events: PageView, ViewContent, Lead, Schedule, MerxusOnboardingStarted, MerxusChatOpened, Purchase
Observed events: none
Missing events: PageView, ViewContent
Skipped events: undefined: Skipped; undefined: Skipped; undefined: Skipped; undefined: Skipped; undefined: Skipped
Console errors: 3
Failed network requests: 0

## Next Action

Safe to continue manual review. Do not enable hard release gate until warning checks are stable.
