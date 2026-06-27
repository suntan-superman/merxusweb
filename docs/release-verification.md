# Merxus Release Verification

Merxus uses the Workside Release Certification Framework through:

```bash
npm run verify:release
```

Useful focused commands:

```bash
npm run verify:release -- -- --only env
npm run verify:release -- -- --only meta
npm run verify:release -- -- --target production --only meta
npm run verify:release -- -- --target production --only meta --certify --archive
```

## Outputs

Reports are written under `reports/Merxus/`:

- `release-report.html`
- `release-report.json`
- `release-summary.md`
- `release-certification.md`
- `release-certificate.pdf` when `--certify` is used
- `latest/`
- `archive/YYYY-MM-DD/HHmmss-<target>-<shortCommit>/` when archive output is enabled

Generated report artifacts are ignored by Git.

## Deployment Recommendation

The report includes a readiness score, grade, and deployment recommendation:

- `SAFE_TO_DEPLOY`
- `SAFE_WITH_WARNINGS`
- `HOLD_RELEASE`
- `DO_NOT_DEPLOY`

Stripe safety violations force `DO_NOT_DEPLOY`. Blocking check failures or missing required Meta events hold the release. Recommended Meta events warn when missing or safely skipped.

## Meta Safety

The safe Meta QA route is:

```text
/meta-event-test?test_event_code=TEST8449
```

The route fires Pixel events only. It does not create real leads, Calendly bookings, Stripe checkout sessions, or charges.
