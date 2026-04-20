import { formatAnalyticsActivityDateTime } from './analyticsActivityFeed.js';
import { compressAnalyticsTrendItems, labelAnalyticsValue } from './analyticsWorkspace.js';

export function getAnalyticsMetricToneClass(hasAttention, critical = false) {
  if (critical) return 'bg-red-100 text-red-700';
  return hasAttention ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
}

export function buildOperationsAnalyticsViewModel(operations = {}, windowDays = 30) {
  const reviewSync = operations?.reviewSync || null;
  const push = operations?.push || null;
  const alerts = operations?.alerts || null;
  const notificationRuns = operations?.notificationRuns || null;
  const readiness = operations?.readiness || null;
  const trendItems = operations?.trends?.daily || [];
  const displayTrendItems = compressAnalyticsTrendItems(
    trendItems,
    ['successSignals', 'attentionSignals', 'pushFailed', 'criticalAlerts'],
    windowDays > 30 ? 12 : 14
  );

  return {
    readiness: readiness
      ? {
          cards: [
            {
              title: 'Readiness Status',
              value: labelAnalyticsValue(readiness.status || 'ready'),
              helper: `${readiness.deployBlockers?.length || 0} blocker group(s) currently active`,
            },
            {
              title: 'Missing Required Env',
              value: readiness.env?.missingRequired?.length || 0,
              helper: `${readiness.env?.missingRecommended?.length || 0} recommended production secret(s) still missing`,
            },
            {
              title: 'Provider Gaps',
              value: readiness.reviewProviders?.missingRequiredProviders?.length || 0,
              helper: `${readiness.reviewProviders?.configuredCount || 0} review provider(s) fully configured`,
            },
            {
              title: 'Operational Scripts',
              value: readiness.operationalScripts?.missing?.length || 0,
              helper: readiness.operationalScripts?.missing?.length
                ? 'One or more audit scripts are still missing'
                : 'All audit scripts are currently present',
            },
          ],
          blockers: (readiness.deployBlockers || []).map((blocker) => ({
            key: blocker.key,
            label: `${labelAnalyticsValue(blocker.key)} • ${blocker.headline || 'Deploy blocker'}`,
            value: blocker.count || 0,
            tone: blocker.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
          })),
          runtimeSources: {
            packageJsonPath: readiness.runtimeSources?.packageJsonPath || 'Unavailable',
            indexManifestPath: readiness.runtimeSources?.indexManifestPath || 'Unavailable',
          },
          operationalAuditCommands: readiness.operationalAuditCommands || [],
        }
      : null,
    reviewSync: reviewSync
      ? {
          cards: [
            {
              title: 'Status',
              value: labelAnalyticsValue(reviewSync.health?.status || 'healthy'),
              helper: `${reviewSync.health?.attentionRequired || 0} attention signals`,
            },
            {
              title: 'Success Rate',
              value: `${reviewSync.totals?.successRate || 0}%`,
              helper: `${reviewSync.totals?.total || 0} runs in window`,
            },
            {
              title: 'Pending Retries',
              value: reviewSync.pendingRetries?.length || 0,
              helper: reviewSync.monitoring?.overdueRetries
                ? `${reviewSync.monitoring.overdueRetries} overdue retry item(s)`
                : reviewSync.health?.stalePlatforms?.length
                  ? `Stale: ${reviewSync.health.stalePlatforms.join(', ')}`
                  : 'No stale-only platforms',
            },
            {
              title: 'Reviews Fetched',
              value: reviewSync.totals?.totalReviewsFetched || 0,
              helper: `Avg ${reviewSync.totals?.averageReviewsFetched || 0} per completed run`,
            },
          ],
          byPlatformRows: (reviewSync.byPlatform || []).slice(0, 5).map((item) => ({
            key: item.platform,
            label: `${labelAnalyticsValue(item.platform)} • ${item.success}/${item.total} success`,
            value: `${item.successRate}%`,
            tone: getAnalyticsMetricToneClass(Boolean(item.attentionRequired)),
          })),
          recentFailure: reviewSync.recentFailures?.[0]
            ? {
                title: `${labelAnalyticsValue(reviewSync.recentFailures[0].platform)} latest failure`,
                description: reviewSync.recentFailures[0].error || 'Review sync failed.',
                timestamp: formatAnalyticsActivityDateTime(reviewSync.recentFailures[0].completedAt),
              }
            : null,
          retryMonitoring: reviewSync.monitoring?.overdueRetries
            ? {
                description: `${reviewSync.monitoring.overdueRetries} retry item(s) are overdue and ${reviewSync.monitoring.schedulerFailures || 0} scheduler-triggered failure(s) are contributing to sync pressure.`,
                helper: `Oldest overdue retry age: ${reviewSync.monitoring.oldestOverdueRetryHours || 0}h`,
              }
            : null,
        }
      : null,
    push: push
      ? {
          cards: [
            {
              title: 'Delivery Rate',
              value: `${push.totals?.deliveryRate || 0}%`,
              helper: `${push.totals?.delivered || 0} delivered, ${push.totals?.failed || 0} failed`,
            },
            {
              title: 'Attention',
              value: push.health?.attentionRequired || 0,
              helper: push.monitoring?.thresholdsExceeded?.elevatedFailureRate
                ? 'Failure rate is above the normal threshold'
                : push.health?.status === 'attention'
                  ? 'Failures, pending receipts, or invalid tokens detected'
                  : 'No active push delivery issues',
            },
            {
              title: 'Invalid Tokens',
              value: push.totals?.invalidTokens || 0,
              helper: push.health?.topError || 'No dominant Expo error',
            },
            {
              title: 'Stale Pending',
              value: push.totals?.stalePendingCount || 0,
              helper: `${push.totals?.pending || 0} pending receipts in window`,
            },
          ],
          byCategoryRows: (push.byCategory || []).slice(0, 5).map((item) => ({
            key: item.category,
            label: `${labelAnalyticsValue(item.category)} • ${item.total} receipts`,
            value: `${item.deliveryRate}%`,
            tone: getAnalyticsMetricToneClass(Boolean(item.attentionRequired)),
          })),
          topError: push.topErrors?.[0]
            ? {
                error: push.topErrors[0].error,
                count: push.topErrors[0].count,
              }
            : null,
          cleanupMonitoring:
            push.monitoring?.thresholdsExceeded?.invalidTokens ||
            push.monitoring?.thresholdsExceeded?.stalePending ||
            push.monitoring?.thresholdsExceeded?.elevatedFailureRate
              ? {
                  description: `${push.monitoring.categoriesWithPressure?.length || 0} delivery category(ies) are showing pressure with a ${push.monitoring.failureRate || 0}% failure rate in the selected window.`,
                  helper: [
                    push.monitoring.thresholdsExceeded?.invalidTokens ? 'invalid tokens' : null,
                    push.monitoring.thresholdsExceeded?.stalePending ? 'stale pending' : null,
                    push.monitoring.thresholdsExceeded?.elevatedFailureRate ? 'failure rate' : null,
                  ]
                    .filter(Boolean)
                    .join(', '),
                }
              : null,
        }
      : null,
    alerts: alerts
      ? {
          cards: [
            {
              title: 'Active Alerts',
              value: alerts.totals?.active || 0,
              helper: `${alerts.totals?.owned || 0} owned • ${alerts.totals?.unowned || 0} unowned`,
            },
            {
              title: 'Critical',
              value: alerts.totals?.critical || 0,
              helper: `${alerts.totals?.warning || 0} warning`,
            },
            {
              title: 'Acknowledged',
              value: alerts.totals?.acknowledged || 0,
              helper: `${alerts.totals?.snoozed || 0} snoozed`,
            },
            {
              title: 'Unowned Age',
              value: `${alerts.unownedAges?.averageHours || 0}h`,
              helper: `Oldest ${alerts.unownedAges?.oldestHours || 0}h`,
            },
          ],
          jobTypeRows: (alerts.jobTypeCounts || []).slice(0, 5).map((item) => ({
            key: item.jobType,
            label: `${labelAnalyticsValue(item.jobType)} • ${item.count} alert(s)`,
            value: item.critical ? `${item.critical} critical` : `${item.warning || 0} warning`,
            tone: getAnalyticsMetricToneClass(Boolean(item.warning), Boolean(item.critical)),
          })),
        }
      : null,
    notificationRuns: notificationRuns
      ? {
          cards: [
            {
              title: 'Status',
              value: labelAnalyticsValue(notificationRuns.health?.status || 'healthy'),
              helper: `${notificationRuns.health?.attentionRequired || 0} active run issues`,
            },
            {
              title: 'Success Rate',
              value: `${notificationRuns.totals?.successRate || 0}%`,
              helper: `${notificationRuns.totals?.total || 0} runs in window`,
            },
            {
              title: 'Failed Runs',
              value: notificationRuns.totals?.failed || 0,
              helper: notificationRuns.monitoring?.staleRunningCount
                ? `${notificationRuns.monitoring.staleRunningCount} stale-running job(s)`
                : `${notificationRuns.totals?.running || 0} still running`,
            },
            {
              title: 'Last Run',
              value: notificationRuns.totals?.lastRunAt
                ? formatAnalyticsActivityDateTime(notificationRuns.totals.lastRunAt)
                : 'No runs',
            },
          ],
          jobTypeRows: (notificationRuns.byJobType || []).slice(0, 5).map((item) => ({
            key: item.jobType,
            label: `${labelAnalyticsValue(item.jobType)} • ${item.total} run(s)`,
            value: `${item.successRate}%`,
            tone: getAnalyticsMetricToneClass(Boolean(item.attentionRequired)),
          })),
          recentFailure: notificationRuns.recentFailures?.[0]
            ? {
                title: `${labelAnalyticsValue(notificationRuns.recentFailures[0].jobType)} latest failure`,
                description: notificationRuns.recentFailures[0].error || 'Recent scheduled run failed.',
                timestamp: formatAnalyticsActivityDateTime(notificationRuns.recentFailures[0].createdAt),
              }
            : null,
          backpressure: notificationRuns.monitoring?.staleRunningCount || notificationRuns.monitoring?.failureStreak
            ? {
                description: `${notificationRuns.monitoring.staleRunningCount || 0} run(s) are beyond the stale-running threshold and the current failure streak is ${notificationRuns.monitoring.failureStreak || 0}.`,
              }
            : null,
        }
      : null,
    trends: {
      displayItems: displayTrendItems,
      successHelper: `${windowDays}d window`,
      attentionHelper: `${operations?.trends?.highestAttentionDay?.label || 'No peak day'} peak`,
      pushHelper: `${operations?.push?.totals?.failed || 0} failed receipt(s)`,
      criticalHelper: `${operations?.alerts?.totals?.critical || 0} critical alert(s)`,
    },
  };
}
