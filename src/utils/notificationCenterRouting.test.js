import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAlertRemediationPath,
  buildNotificationAlertInspectTarget,
  buildNotificationCustomer360Path,
  buildNotificationCustomer360Target,
  buildNotificationEventActionModel,
  buildNotificationSourceSurfacePath,
  buildNotificationSourceSurfaceTarget,
  buildNotificationSpeechRuntimePath,
  buildFeedbackIntegrationsPath,
  buildFeedbackRecoveryPath,
  buildReviewDetailPath,
  deriveRemediationFocus,
  getReviewRemediationSummary,
  isNotificationReviewAlertEvent,
  isNotificationReviewRemediationEvent,
  labelizeNotificationCenterValue,
} from './notificationCenterRouting.js';

test('deriveRemediationFocus maps common review-health reasons', () => {
  assert.equal(deriveRemediationFocus('awaiting_first_sync'), 'validation');
  assert.equal(deriveRemediationFocus('stale_connection'), 'provider_health');
  assert.equal(deriveRemediationFocus('sync_failed'), 'sync_attention');
  assert.equal(deriveRemediationFocus('provider_attention', '2026-04-19T12:00:00Z'), 'sync_attention');
  assert.equal(deriveRemediationFocus('healthy'), '');
});

test('buildReviewDetailPath and buildFeedbackRecoveryPath use existing tenant routes', () => {
  assert.equal(
    buildReviewDetailPath('real_estate', { reviewId: 'rev-42' }),
    '/estate/reviews?reviewId=rev-42'
  );
  assert.equal(
    buildFeedbackRecoveryPath('restaurant', {
      rootEvent: { structuredData: { internalFeedbackId: 'feedback-9' } },
    }),
    '/restaurant/feedback?feedbackId=feedback-9'
  );
});

test('getReviewRemediationSummary normalizes provider context from existing payload shapes', () => {
  const summary = getReviewRemediationSummary({
    event: {
      structuredData: {
        remediationPlatform: 'google',
        remediationReason: 'sync_failed',
        nextRetryAt: '2026-04-20T01:00:00Z',
        errorMessage: 'Scope missing',
      },
    },
  });

  assert.deepEqual(summary, {
    platform: 'google',
    reason: 'sync_failed',
    nextRetryAt: '2026-04-20T01:00:00Z',
    message: 'Scope missing',
  });
});

test('buildFeedbackIntegrationsPath preserves explicit remediation paths and injects missing focus', () => {
  assert.equal(
    buildFeedbackIntegrationsPath('restaurant', {
      remediationPath: '/restaurant/feedback/integrations?platform=trustpilot',
      alertContext: { reason: 'sync_failed' },
    }),
    '/restaurant/feedback/integrations?platform=trustpilot&focus=sync_attention'
  );
});

test('buildFeedbackIntegrationsPath falls back to provider-aware workspace routes', () => {
  assert.equal(
    buildFeedbackIntegrationsPath('voice', {
      reviewPlatform: 'facebook',
      structuredData: { remediationReason: 'stale_connection' },
    }),
    '/voice/feedback/integrations?platform=facebook&focus=provider_health'
  );
});

test('buildAlertRemediationPath enriches feedback integration links without duplicating focus', () => {
  assert.equal(
    buildAlertRemediationPath({
      remediationPath: '/restaurant/feedback/integrations?platform=google',
      alertContext: { reason: 'awaiting_first_sync' },
    }),
    '/restaurant/feedback/integrations?platform=google&focus=validation'
  );

  assert.equal(
    buildAlertRemediationPath({
      remediationPath: '/restaurant/feedback/integrations?platform=google&focus=sync_attention',
      alertContext: { reason: 'awaiting_first_sync' },
    }),
    '/restaurant/feedback/integrations?platform=google&focus=sync_attention'
  );
});

test('notification-center value labels and event-type guards normalize common operator values', () => {
  assert.equal(labelizeNotificationCenterValue('review_sync_failed'), 'Review Sync Failed');
  assert.equal(isNotificationReviewAlertEvent({ eventType: 'negative_review' }), true);
  assert.equal(isNotificationReviewAlertEvent({ eventType: 'daily_digest' }), false);
  assert.equal(isNotificationReviewRemediationEvent({ eventType: 'review_sync_failed' }), true);
});

test('buildNotificationEventActionModel derives review, recovery, and integrations actions from shared routing', () => {
  assert.deepEqual(
    buildNotificationEventActionModel('restaurant', {
      eventType: 'review_sync_failed',
      reviewId: 'review-1',
      rootEvent: { structuredData: { internalFeedbackId: 'feedback-1' } },
      structuredData: {
        remediationPlatform: 'google',
        remediationReason: 'sync_failed',
      },
    }),
    {
      reviewPath: '/restaurant/reviews?reviewId=review-1',
      feedbackRecoveryPath: '/restaurant/feedback?feedbackId=feedback-1',
      feedbackIntegrationsPath:
        '/restaurant/feedback/integrations?platform=google&focus=sync_attention',
      remediationSummary: {
        platform: 'google',
        reason: 'sync_failed',
        nextRetryAt: null,
        message: null,
      },
      canOpenReview: false,
      canOpenRecovery: true,
      canOpenIntegrations: true,
      integrationsLabel: 'Open Google Integrations',
      hasAnyAction: true,
    }
  );
});

test('buildNotificationAlertInspectTarget prefers the most actionable inspect target', () => {
  assert.deepEqual(
    buildNotificationAlertInspectTarget({
      lastObservedEventId: 'event-1',
      lastObservedRunId: 'run-1',
    }),
    {
      type: 'event',
      id: 'event-1',
      label: 'Open Event',
    }
  );

  assert.deepEqual(
    buildNotificationAlertInspectTarget({
      lastObservedRunId: 'run-1',
    }),
    {
      type: 'run',
      id: 'run-1',
      label: 'Open Run',
    }
  );
});

test('buildNotificationSpeechRuntimePath reuses tenant-specific settings routes', () => {
  assert.equal(
    buildNotificationSpeechRuntimePath('restaurant', 'speech_provider_health'),
    '/settings?tab=ai&panel=speech-runtime'
  );
  assert.equal(
    buildNotificationSpeechRuntimePath('real_estate', 'speech_provider_health'),
    '/estate/settings?tab=ai&panel=speech-runtime'
  );
  assert.equal(
    buildNotificationSpeechRuntimePath('voice', 'daily_digest'),
    null
  );
});

test('customer-360 routing resolves tenant paths and linked-object focus from graph refs', () => {
  assert.equal(
    buildNotificationCustomer360Path('voice', 'customer-7', {
      section: 'appointments',
      focusId: 'appt-9',
    }),
    '/voice/customer-360/customer-7?section=appointments&focusId=appt-9'
  );

  assert.deepEqual(
    buildNotificationCustomer360Target('real_estate', {
      customerId: 'customer-7',
      showingId: 'showing-22',
    }),
    {
      customerId: 'customer-7',
      linkedObject: {
        section: 'showings',
        focusId: 'showing-22',
        label: 'Open Showing',
      },
      label: 'Open Showing',
      path: '/estate/customer-360/customer-7?section=showings&focusId=showing-22',
    }
  );
});

test('notification source-surface routing builds call and sms drilldowns with labels', () => {
  assert.equal(
    buildNotificationSourceSurfacePath('restaurant', {
      sourceType: 'call_session',
      sourceRefId: 'call-1',
    }),
    '/restaurant/calls?callId=call-1'
  );

  assert.deepEqual(
    buildNotificationSourceSurfaceTarget('voice', {
      sourceType: 'sms_message',
      sourceRefId: 'SM123',
      customer: { phone: '+15555550123' },
    }),
    {
      label: 'Open SMS Inbox',
      path: '/voice/sms?contactPhone=%2B15555550123&messageSid=SM123',
    }
  );
});
