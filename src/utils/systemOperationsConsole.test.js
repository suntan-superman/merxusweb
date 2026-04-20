import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSystemOperationsConsoleModel,
  labelizeOperationsValue,
  maxByValue,
} from './systemOperationsConsole.js';

test('labelizeOperationsValue humanizes underscored values', () => {
  assert.equal(labelizeOperationsValue('review_sync'), 'Review Sync');
});

test('maxByValue returns the highest selected item', () => {
  const result = maxByValue(
    [
      { key: 'a', count: 1 },
      { key: 'b', count: 5 },
      { key: 'c', count: 2 },
    ],
    (item) => item.count
  );

  assert.deepEqual(result, { key: 'b', count: 5 });
});

test('buildSystemOperationsConsoleModel derives pressure-heavy spotlights and monitoring cards', () => {
  const model = buildSystemOperationsConsoleModel({
    operations: {
      readiness: {
        status: 'attention',
        deployBlockers: [{ key: 'required_env' }, { key: 'review_providers' }],
        env: { missingRequired: [{ name: 'INTERNAL_API_KEY' }] },
        reviewProviders: { missingRequiredProviders: [{ key: 'google' }, { key: 'facebook' }] },
      },
      trends: {
        days: 7,
        totals: {
          reviewSyncFailures: 4,
          schedulerFailures: 2,
          pushFailures: 3,
          criticalAlerts: 1,
        },
        highestAttentionDay: {
          label: 'Tue',
          attentionSignals: 6,
        },
        daily: [
          { date: '2026-04-18', label: 'Fri', successSignals: 3, attentionSignals: 1 },
          { date: '2026-04-19', label: 'Sat', successSignals: 2, attentionSignals: 5 },
        ],
      },
      reviewSync: {
        recentFailures: [{ platform: 'trustpilot', error: 'oauth_expired' }],
        byPlatform: [{ platform: 'google', failed: 1 }, { platform: 'trustpilot', failed: 4 }],
        monitoring: {
          overdueRetries: 2,
          schedulerFailures: 1,
          thresholdsExceeded: {
            criticalFailures: true,
          },
        },
      },
      notificationRuns: {
        health: {
          lastRunAt: '2026-04-19T12:00:00.000Z',
          attentionRequired: 3,
        },
        recentFailures: [{ jobType: 'daily_digest', error: 'job_failed' }],
        monitoring: {
          staleRunningCount: 1,
          failureStreak: 2,
          thresholdsExceeded: {
            staleRunning: true,
          },
        },
      },
      push: {
        topErrors: [{ error: 'DeviceNotRegistered', count: 3 }],
        totals: {
          invalidTokens: 5,
          stalePendingCount: 2,
          deliveryRate: 87,
          failureRate: 13,
        },
        health: {
          categoriesWithPressure: ['operations'],
        },
        monitoring: {
          thresholdsExceeded: {
            invalidTokens: true,
            elevatedFailureRate: true,
          },
        },
      },
    },
  });

  assert.equal(model.maxSignals, 5);
  assert.equal(model.busiestPlatform.platform, 'trustpilot');
  assert.equal(model.readinessBlockers, 2);
  assert.equal(model.statCards[4].value, 2);
  assert.equal(model.spotlights[0].value, 'Trustpilot needs attention');
  assert.match(model.spotlights[2].helper, /invalid token/);
  assert.equal(model.monitoringCards[0].value, 'Threshold exceeded');
  assert.equal(model.monitoringCards[3].value, 'Needs operator review');
});

test('buildSystemOperationsConsoleModel returns healthy defaults when analytics are sparse', () => {
  const model = buildSystemOperationsConsoleModel({});

  assert.equal(model.maxSignals, 0);
  assert.equal(model.trendWindowDays, 0);
  assert.equal(model.statCards[0].helper, 'No failing review platform in the current window.');
  assert.equal(model.spotlights[0].value, 'Review sync is stable');
  assert.equal(model.spotlights[3].value, 'Production readiness is aligned');
  assert.equal(model.monitoringCards[3].value, 'Within threshold');
});
