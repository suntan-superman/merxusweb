import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFeedbackFocusNotice,
  buildFeedbackRemediationHighlights,
  buildValidationFallback,
  platformDisplayName,
  remediationFocusLabel,
  sortFeedbackIntegrations,
} from './feedbackIntegrationsRouting.js';

test('platformDisplayName and remediationFocusLabel humanize supported values', () => {
  assert.equal(platformDisplayName('google'), 'Google Business Profile');
  assert.equal(platformDisplayName('custom_platform'), 'Review platform');
  assert.equal(remediationFocusLabel('sync_attention'), 'Sync Attention');
  assert.equal(remediationFocusLabel('provider_health'), 'Provider Health');
});

test('sortFeedbackIntegrations prioritizes focused and attention-needed providers', () => {
  const sorted = sortFeedbackIntegrations(
    [
      { key: 'facebook', label: 'Facebook', health: 'healthy' },
      { key: 'google', label: 'Google', health: 'attention' },
      { key: 'trustpilot', label: 'Trustpilot', health: 'stale' },
    ],
    'facebook'
  );

  assert.deepEqual(
    sorted.map((item) => item.key),
    ['facebook', 'google', 'trustpilot']
  );
});

test('buildFeedbackRemediationHighlights summarizes retry pressure and validation issues', () => {
  const highlights = buildFeedbackRemediationHighlights({
    integrations: [
      { key: 'google', pendingRetryCount: 2 },
      { key: 'facebook', pendingRetryCount: 0 },
    ],
    syncRunAnalytics: {
      overdueRetries: [{ id: 'retry-1' }, { id: 'retry-2' }],
      health: { remediationHint: 'Review overdue retries first.' },
    },
    validationByPlatform: {
      google: { missingScopes: ['reviews.read'] },
      facebook: { liveCheck: { ok: true } },
    },
  });

  assert.deepEqual(
    highlights.map((item) => item.key),
    ['overdue_retries', 'provider_retries', 'validation']
  );
  assert.equal(highlights[0].helper, 'Review overdue retries first.');
});

test('buildFeedbackFocusNotice creates focused-remediation banner copy', () => {
  assert.equal(
    buildFeedbackFocusNotice({
      focusPlatform: 'google',
      remediationFocus: 'validation',
    }),
    'Google Business Profile is highlighted below. Focus: Validation.'
  );
});

test('buildValidationFallback returns a provider-error snapshot', () => {
  assert.deepEqual(buildValidationFallback(new Error('Token refresh failed.')), {
    success: false,
    status: 'attention',
    connectionStatus: 'provider_error',
    liveCheck: {
      ok: false,
      message: 'Token refresh failed.',
    },
    warnings: [],
    recommendedActions: ['Retry validation or reconnect the provider.'],
    issues: [],
    attentionReasons: ['provider_error'],
    primaryIssueCode: 'provider_error',
    primaryAction: 'Retry validation or reconnect the provider.',
    remediation: {
      issueCode: 'provider_error',
      focus: 'provider',
      urgency: 'high',
      primaryAction: 'Retry validation or reconnect the provider.',
      nextSteps: ['Retry validation or reconnect the provider.'],
      routeHint: 'feedback_integrations',
    },
  });
});
