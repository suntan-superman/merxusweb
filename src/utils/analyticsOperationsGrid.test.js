import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOperationsAnalyticsViewModel,
  getAnalyticsMetricToneClass,
} from './analyticsOperationsGrid.js';

test('getAnalyticsMetricToneClass maps attention and critical states', () => {
  assert.equal(getAnalyticsMetricToneClass(false), 'bg-emerald-100 text-emerald-700');
  assert.equal(getAnalyticsMetricToneClass(true), 'bg-amber-100 text-amber-700');
  assert.equal(getAnalyticsMetricToneClass(true, true), 'bg-red-100 text-red-700');
});

test('buildOperationsAnalyticsViewModel shapes readiness, review sync, push, alerts, scheduler, and trend panels', () => {
  const model = buildOperationsAnalyticsViewModel(
    {
      readiness: {
        status: 'warning',
        deployBlockers: [{ key: 'required_env', headline: 'Required env missing', count: 1, severity: 'critical' }],
        env: { missingRequired: ['INTERNAL_API_KEY'], missingRecommended: ['SLACK_BOT_TOKEN'] },
        reviewProviders: { missingRequiredProviders: ['google'], configuredCount: 2 },
        operationalScripts: { missing: ['ops:audit'] },
        runtimeSources: { packageJsonPath: 'package.json', indexManifestPath: 'firestore.indexes.json' },
        operationalAuditCommands: ['npm run ops:audit -- --attention-only'],
      },
      reviewSync: {
        health: { status: 'attention', attentionRequired: 3, stalePlatforms: ['google'] },
        totals: { successRate: 91, total: 12, totalReviewsFetched: 44, averageReviewsFetched: 4 },
        pendingRetries: [{ id: 'retry_1' }],
        byPlatform: [{ platform: 'google', success: 3, total: 5, successRate: 60, attentionRequired: 1 }],
        recentFailures: [{ platform: 'facebook', error: 'Permissions missing', completedAt: '2026-04-19T12:00:00.000Z' }],
        monitoring: { overdueRetries: 2, schedulerFailures: 1, oldestOverdueRetryHours: 6 },
      },
      push: {
        health: { status: 'attention', attentionRequired: 2, topError: 'DeviceNotRegistered' },
        totals: { deliveryRate: 95, delivered: 19, failed: 1, invalidTokens: 2, stalePendingCount: 1, pending: 3 },
        byCategory: [{ category: 'operations', total: 6, deliveryRate: 80, attentionRequired: 1 }],
        topErrors: [{ error: 'DeviceNotRegistered', count: 2 }],
        monitoring: {
          failureRate: 12,
          categoriesWithPressure: ['operations'],
          thresholdsExceeded: { invalidTokens: true, stalePending: false, elevatedFailureRate: true },
        },
      },
      alerts: {
        totals: { active: 5, owned: 2, unowned: 3, critical: 2, warning: 3, acknowledged: 1, snoozed: 1 },
        unownedAges: { averageHours: 4, oldestHours: 9 },
        jobTypeCounts: [{ jobType: 'review_sync', count: 3, critical: 2, warning: 1 }],
      },
      notificationRuns: {
        health: { status: 'warning', attentionRequired: 1 },
        totals: { successRate: 88, total: 10, failed: 2, running: 1, lastRunAt: '2026-04-19T13:00:00.000Z' },
        byJobType: [{ jobType: 'daily_digest', total: 6, successRate: 83, attentionRequired: 1 }],
        recentFailures: [{ jobType: 'daily_digest', error: 'Timeout', createdAt: '2026-04-19T13:15:00.000Z' }],
        monitoring: { staleRunningCount: 1, failureStreak: 2 },
      },
      trends: {
        highestAttentionDay: { label: 'Apr 18' },
        daily: Array.from({ length: 16 }, (_, index) => ({
          date: `2026-04-${String(index + 1).padStart(2, '0')}`,
          label: `Apr ${index + 1}`,
          successSignals: index + 1,
          attentionSignals: index % 3,
          pushFailed: index % 2,
          criticalAlerts: index === 5 ? 1 : 0,
        })),
      },
    },
    90
  );

  assert.equal(model.readiness.cards[0].value, 'Warning');
  assert.equal(model.readiness.blockers[0].tone, 'bg-red-100 text-red-700');
  assert.equal(model.reviewSync.byPlatformRows[0].label, 'Google • 3/5 success');
  assert.equal(model.reviewSync.retryMonitoring.helper, 'Oldest overdue retry age: 6h');
  assert.equal(model.push.cleanupMonitoring.helper, 'invalid tokens, failure rate');
  assert.equal(model.alerts.jobTypeRows[0].tone, 'bg-red-100 text-red-700');
  assert.equal(model.notificationRuns.backpressure.description, '1 run(s) are beyond the stale-running threshold and the current failure streak is 2.');
  assert.equal(model.trends.displayItems.length < 16, true);
  assert.equal(model.trends.attentionHelper, 'Apr 18 peak');
});

test('buildOperationsAnalyticsViewModel returns sparse defaults when operations are missing', () => {
  const model = buildOperationsAnalyticsViewModel({}, 30);

  assert.equal(model.readiness, null);
  assert.equal(model.reviewSync, null);
  assert.equal(model.push, null);
  assert.equal(model.alerts, null);
  assert.equal(model.notificationRuns, null);
  assert.deepEqual(model.trends.displayItems, []);
});
