export function getAnalyticsHealthPriorityToneClasses(severity) {
  const normalized = String(severity || 'healthy').toLowerCase();
  if (normalized === 'critical') return 'border-red-200 bg-red-50 text-red-800';
  if (normalized === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function buildAnalyticsHealthPrioritySections(operations = {}) {
  const sections = [
    {
      key: 'readiness',
      title: 'Readiness Priority',
      health: operations?.readiness
        ? {
            severity:
              operations.readiness.status === 'attention'
                ? 'critical'
                : operations.readiness.status === 'warning'
                  ? 'warning'
                  : 'healthy',
            headline:
              operations.readiness.status === 'attention'
                ? 'Production readiness still has deploy blockers'
                : operations.readiness.status === 'warning'
                  ? 'Production readiness still has recommended gaps'
                  : 'Production readiness is currently aligned',
            remediationHint:
              operations.readiness.status === 'attention'
                ? 'Clear the active deploy blockers in the readiness workspace before the next rollout.'
                : operations.readiness.status === 'warning'
                  ? 'Review the remaining recommended runtime gaps before the next rollout window.'
                  : 'Continue using the shared readiness workspace as the final pre-deploy verification pass.',
            attentionRequired: operations.readiness.deployBlockers?.length || 0,
          }
        : null,
      detailLine: operations?.readiness
        ? `Required env gaps: ${operations.readiness.env?.missingRequired?.length || 0} • Provider gaps: ${operations.readiness.reviewProviders?.missingRequiredProviders?.length || 0}`
        : null,
    },
    {
      key: 'reviewSync',
      title: 'Review Sync Priority',
      health: operations?.reviewSync?.health || null,
      detailLine: operations?.reviewSync?.monitoring
        ? `Overdue retries: ${operations.reviewSync.monitoring.overdueRetries || 0} • Scheduler failures: ${operations.reviewSync.monitoring.schedulerFailures || 0}`
        : null,
    },
    {
      key: 'push',
      title: 'Push Priority',
      health: operations?.push?.health || null,
      detailLine: operations?.push?.monitoring
        ? `Failure rate: ${operations.push.monitoring.failureRate || 0}% • Pressure categories: ${operations.push.monitoring.categoriesWithPressure?.length || 0}`
        : null,
    },
    {
      key: 'notificationRuns',
      title: 'Scheduler Priority',
      health: operations?.notificationRuns?.health || null,
      detailLine: operations?.notificationRuns?.monitoring
        ? `Stale running: ${operations.notificationRuns.monitoring.staleRunningCount || 0} • Failure streak: ${operations.notificationRuns.monitoring.failureStreak || 0}`
        : null,
    },
  ];

  return sections.filter((item) => item.health);
}
