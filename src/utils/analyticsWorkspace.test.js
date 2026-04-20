import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyticsExportRows,
  buildAnalyticsOverviewCards,
  compressAnalyticsTrendItems,
  labelAnalyticsValue,
} from './analyticsWorkspace.js';

test('labelAnalyticsValue converts underscored values into title case labels', () => {
  assert.equal(labelAnalyticsValue('real_estate'), 'Real Estate');
  assert.equal(labelAnalyticsValue(null), 'Unknown');
});

test('compressAnalyticsTrendItems keeps small trend sets intact', () => {
  const items = [{ date: '2026-04-01', label: 'Apr 1', successSignals: 2 }];
  assert.deepEqual(compressAnalyticsTrendItems(items, ['successSignals'], 7), items);
});

test('compressAnalyticsTrendItems buckets and sums numeric metrics for longer windows', () => {
  const items = [
    { date: '2026-04-01', label: 'Apr 1', successSignals: 1, attentionSignals: 2 },
    { date: '2026-04-02', label: 'Apr 2', successSignals: 3, attentionSignals: 4 },
    { date: '2026-04-03', label: 'Apr 3', successSignals: 5, attentionSignals: 6 },
    { date: '2026-04-04', label: 'Apr 4', successSignals: 7, attentionSignals: 8 },
  ];

  const compressed = compressAnalyticsTrendItems(items, ['successSignals', 'attentionSignals'], 2);

  assert.deepEqual(compressed, [
    {
      date: '2026-04-01-2026-04-02',
      label: 'Apr 1-Apr 2',
      successSignals: 4,
      attentionSignals: 6,
    },
    {
      date: '2026-04-03-2026-04-04',
      label: 'Apr 3-Apr 4',
      successSignals: 12,
      attentionSignals: 14,
    },
  ]);
});

test('buildAnalyticsOverviewCards returns system-level summary cards', () => {
  const cards = buildAnalyticsOverviewCards({
    isTenantAnalytics: false,
    analytics: {
      totalRestaurants: 12,
      activeUsers: 28,
      totalUsers: 35,
      operations: {
        alerts: { totals: { active: 5, critical: 2 } },
        reviewSync: { health: { attentionRequired: 3 }, totals: { successRate: 91 } },
        push: { totals: { deliveryRate: 97, failed: 4 } },
        notificationRuns: { totals: { failed: 2, running: 1 } },
        readiness: { deployBlockers: [{ key: 'env' }], env: { missingRequired: ['INTERNAL_API_KEY'] } },
      },
    },
  });

  assert.equal(cards[0].title, 'Restaurants');
  assert.equal(cards.at(-1).title, 'Deploy Blockers');
  assert.equal(cards.at(-1).value, 1);
});

test('buildAnalyticsOverviewCards returns tenant-level summary cards', () => {
  const cards = buildAnalyticsOverviewCards({
    isTenantAnalytics: true,
    analytics: {
      feedback: {
        funnel: { reviewInviteConversionRate: 42 },
        recovery: { resolutionRate: 88, resolved: 7, open: 2 },
        reviews: { total: 18, averageRating: 4.7 },
      },
      operations: {
        reviewSync: { health: { attentionRequired: 2 }, pendingRetries: [{ id: 'retry_1' }] },
        push: { totals: { deliveryRate: 96, invalidTokens: 1 } },
        alerts: { totals: { active: 3, unowned: 1 } },
      },
    },
  });

  assert.equal(cards[0].title, 'Invite Conversion');
  assert.equal(cards[2].value, 4.7);
  assert.equal(cards.at(-1).helper, '1 unowned');
});

test('buildAnalyticsExportRows builds tenant export rows with labeled scope', () => {
  const rows = buildAnalyticsExportRows({
    isTenantAnalytics: true,
    windowDays: 30,
    analytics: {
      tenantType: 'real_estate',
      feedback: {
        funnel: { reviewInviteConversionRate: 55 },
        recovery: { resolutionRate: 80 },
        reviews: {
          byPlatform: [{ platform: 'google', count: 9 }],
        },
      },
      reporting: {
        history: { weekly: [{ label: 'Week 1', successSignals: 4, attentionSignals: 1, pushFailures: 0, criticalAlerts: 0 }] },
        storylines: [{ title: 'Momentum', tone: 'healthy', description: 'Trend is positive.', route: '/analytics?focus=momentum' }],
      },
    },
  });

  assert.equal(rows[0].scope, 'Real Estate');
  assert.equal(rows.some((row) => row.section === 'reviews_by_platform' && row.metric === 'google' && row.value === 9), true);
  assert.equal(rows.some((row) => row.section === 'storyline' && row.metric === 'Momentum'), true);
});

test('buildAnalyticsExportRows builds system export rows with readiness and remediation context', () => {
  const rows = buildAnalyticsExportRows({
    isTenantAnalytics: false,
    windowDays: 90,
    analytics: {
      crossTenant: {
        byTenantType: [
          {
            label: 'Restaurants',
            accounts: 8,
            attentionSignals: 5,
            reviewSyncSuccessRate: 93,
            pushDeliveryRate: 97,
            activeAlerts: 2,
            topIssue: { key: 'review_sync', headline: 'Sync pressure' },
            trend: {
              highestAttentionDay: { label: 'Apr 10', attentionSignals: 3 },
              strongestDay: { label: 'Apr 12', successSignals: 7 },
            },
            pressureSources: [{ key: 'reviews', value: 3, severity: 'warning', helper: 'Retry pressure', route: '/merxus/analytics?focus=reviews' }],
          },
        ],
        remediationQueue: [
          {
            label: 'Restaurants',
            tenantType: 'restaurant',
            attentionSignals: 5,
            severity: 'warning',
            headline: 'Retry pressure is elevated',
            peakAttentionDay: { label: 'Apr 10' },
            route: '/merxus/analytics?focus=restaurant',
            opsAuditRoute: '/merxus/ops-audit?focus=restaurant',
          },
        ],
      },
      operations: {
        readiness: {
          status: 'warning',
          deployBlockers: [{ key: 'providers', severity: 'warning', count: 2, headline: 'Provider credentials missing' }],
          env: { missingRequired: ['INTERNAL_API_KEY'] },
          reviewProviders: { missingRequiredProviders: ['google'] },
          operationalAuditCommands: ['npm run ops:audit -- --attention-only'],
        },
      },
      reporting: {
        history: { weekly: [] },
        storylines: [],
      },
    },
  });

  assert.equal(rows.some((row) => row.section === 'production_readiness' && row.value === 'warning'), true);
  assert.equal(rows.some((row) => row.section === 'production_readiness_commands' && row.value === 'npm run ops:audit -- --attention-only'), true);
  assert.equal(rows.some((row) => row.section === 'cross_tenant_remediation_queue' && row.metric === 'restaurant'), true);
});
