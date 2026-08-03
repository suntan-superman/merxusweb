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

## Bilingual Voice QA

`npm run verify:release` also writes `bilingual-voice-qa-certification.json` and
`bilingual-voice-qa-certification.md` beside the normal Merxus release reports.
These files consume the existing backend report at
`../merxus-ai-backend/reports/spanish-voice-qa/release-latest.json`; they do not
place calls or duplicate the backend QA logic.

Regenerate that source report before a bilingual pilot release with:

```powershell
Set-Location ..\merxus-ai-backend
npm run voice:qa:release
```

The certification explicitly preserves `bilingualProductionReady: false` until
the controlled human pilot has been approved.

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
