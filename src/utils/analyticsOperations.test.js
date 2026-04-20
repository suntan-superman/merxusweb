import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyticsHealthPrioritySections,
  getAnalyticsHealthPriorityToneClasses,
} from './analyticsOperations.js';

test('getAnalyticsHealthPriorityToneClasses maps severity values to stable classes', () => {
  assert.equal(getAnalyticsHealthPriorityToneClasses('critical'), 'border-red-200 bg-red-50 text-red-800');
  assert.equal(getAnalyticsHealthPriorityToneClasses('warning'), 'border-amber-200 bg-amber-50 text-amber-800');
  assert.equal(getAnalyticsHealthPriorityToneClasses('healthy'), 'border-emerald-200 bg-emerald-50 text-emerald-800');
});

test('buildAnalyticsHealthPrioritySections returns normalized readiness, sync, push, and scheduler sections', () => {
  const sections = buildAnalyticsHealthPrioritySections({
    readiness: {
      status: 'warning',
      deployBlockers: [],
      env: { missingRequired: ['INTERNAL_API_KEY'] },
      reviewProviders: { missingRequiredProviders: ['google'] },
    },
    reviewSync: {
      health: {
        severity: 'critical',
        headline: 'Review sync retries are backing up',
        remediationHint: 'Open the integrations workspace.',
        attentionRequired: 3,
      },
      monitoring: {
        overdueRetries: 2,
        schedulerFailures: 1,
      },
    },
    push: {
      health: {
        severity: 'warning',
        headline: 'Push delivery needs attention',
        remediationHint: 'Review the receipt health panel.',
        attentionRequired: 2,
      },
      monitoring: {
        failureRate: 12,
        categoriesWithPressure: ['reviews', 'operations'],
      },
    },
    notificationRuns: {
      health: {
        severity: 'warning',
        headline: 'Scheduler backlog is rising',
        remediationHint: 'Inspect failed jobs.',
        attentionRequired: 1,
      },
      monitoring: {
        staleRunningCount: 1,
        failureStreak: 3,
      },
    },
  });

  assert.equal(sections.length, 4);
  assert.equal(sections[0].key, 'readiness');
  assert.equal(sections[0].health.severity, 'warning');
  assert.equal(sections[0].detailLine, 'Required env gaps: 1 • Provider gaps: 1');
  assert.equal(sections[1].detailLine, 'Overdue retries: 2 • Scheduler failures: 1');
  assert.equal(sections[2].detailLine, 'Failure rate: 12% • Pressure categories: 2');
  assert.equal(sections[3].detailLine, 'Stale running: 1 • Failure streak: 3');
});

test('buildAnalyticsHealthPrioritySections omits missing health sections', () => {
  const sections = buildAnalyticsHealthPrioritySections({
    push: {
      health: {
        severity: 'healthy',
        headline: 'Push is healthy',
        remediationHint: 'No action needed.',
        attentionRequired: 0,
      },
    },
  });

  assert.deepEqual(sections, [
    {
      key: 'push',
      title: 'Push Priority',
      health: {
        severity: 'healthy',
        headline: 'Push is healthy',
        remediationHint: 'No action needed.',
        attentionRequired: 0,
      },
      detailLine: null,
    },
  ]);
});
