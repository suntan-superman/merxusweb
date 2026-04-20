import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatNotificationCenterTimestamp,
  formatNotificationCenterReasonLabel,
  getNotificationCenterAlertIssueSummary,
  getNotificationCenterAlertTone,
  getNotificationCenterPushHealthTone,
  getNotificationCenterSpeechProviderCounts,
  getNotificationCenterSpeechProviderTone,
  getNotificationCenterStatusTone,
  isRetryableNotificationCenterEvent,
  labelForNotificationCenterJobType,
} from './notificationCenterPresentation.js';

test('notification center presentation helpers normalize timestamps, tones, and labels', () => {
  assert.equal(formatNotificationCenterTimestamp(''), '—');
  assert.equal(
    formatNotificationCenterTimestamp({ seconds: 1713556800 }).includes('2024'),
    true
  );
  assert.equal(getNotificationCenterStatusTone('failed'), 'bg-red-100 text-red-700');
  assert.equal(getNotificationCenterStatusTone('delivered'), 'bg-green-100 text-green-700');
  assert.equal(getNotificationCenterAlertTone('critical'), 'border-red-200 bg-red-50 text-red-800');
  assert.equal(getNotificationCenterPushHealthTone('attention'), 'border-amber-200 bg-amber-50 text-amber-800');
  assert.equal(labelForNotificationCenterJobType('review_sync'), 'Review Sync');
  assert.equal(formatNotificationCenterReasonLabel('provider_attention'), 'provider attention');
});

test('notification center alert issue summary prefers failure count then health metadata', () => {
  assert.equal(
    getNotificationCenterAlertIssueSummary({ consecutiveFailures: 3 }),
    'Consecutive failures: 3'
  );
  assert.equal(
    getNotificationCenterAlertIssueSummary({
      alertContext: { reason: 'provider_attention' },
    }),
    'provider attention'
  );
});

test('notification center speech helpers derive counts and tone classes', () => {
  const counts = getNotificationCenterSpeechProviderCounts({
    speech: {
      providers: [
        { id: 'a', selected: true, ok: false },
        { id: 'b', selected: true, ok: true },
        { id: 'c', selected: false, ok: false },
      ],
    },
  });

  assert.equal(counts.providers.length, 3);
  assert.equal(counts.selected.length, 2);
  assert.equal(counts.unhealthy.length, 2);
  assert.equal(counts.unhealthySelected.length, 1);
  assert.equal(getNotificationCenterSpeechProviderTone({ ok: false }), 'bg-red-100 text-red-700');
  assert.equal(getNotificationCenterSpeechProviderTone({ ok: true }), 'bg-green-100 text-green-700');
});

test('isRetryableNotificationCenterEvent excludes retried or successful events', () => {
  assert.equal(
    isRetryableNotificationCenterEvent({ status: 'failed' }),
    true
  );
  assert.equal(
    isRetryableNotificationCenterEvent({ latestRetryStatus: 'error', retryOfEventId: 'evt_1' }),
    false
  );
  assert.equal(
    isRetryableNotificationCenterEvent({ status: 'delivered' }),
    false
  );
});
