export function labelizeOperationsValue(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function maxByValue(items = [], selector) {
  return items.reduce((best, item) => {
    if (!best) return item;
    return selector(item) > selector(best) ? item : best;
  }, null);
}

export function buildSystemOperationsConsoleModel(analytics = {}) {
  const operations = analytics?.operations || {};
  const readiness = operations?.readiness || null;
  const trends = operations?.trends || null;
  const daily = trends?.daily || [];
  const totals = trends?.totals || {};
  const highestAttentionDay = trends?.highestAttentionDay || null;
  const reviewFailure = operations?.reviewSync?.recentFailures?.[0] || null;
  const schedulerFailure = operations?.notificationRuns?.recentFailures?.[0] || null;
  const pushError = operations?.push?.topErrors?.[0] || null;
  const busiestPlatform = maxByValue(operations?.reviewSync?.byPlatform || [], (item) => item.failed || 0);
  const maxSignals = Math.max(...daily.map((item) => Math.max(item.successSignals || 0, item.attentionSignals || 0)), 0);
  const reviewMonitoring = operations?.reviewSync?.monitoring || {};
  const pushMonitoring = operations?.push?.monitoring || {};
  const schedulerMonitoring = operations?.notificationRuns?.monitoring || {};
  const readinessBlockers = Array.isArray(readiness?.deployBlockers) ? readiness.deployBlockers.length : 0;
  const readinessMissingEnv = readiness?.env?.missingRequired?.length || 0;
  const readinessMissingProviders = readiness?.reviewProviders?.missingRequiredProviders?.length || 0;

  const statCards = [
    {
      title: 'Review Sync Failures',
      value: totals.reviewSyncFailures || 0,
      helper: busiestPlatform
        ? `${labelizeOperationsValue(busiestPlatform.platform)} is carrying the most failed runs.`
        : 'No failing review platform in the current window.',
      tone: 'sky',
    },
    {
      title: 'Scheduler Failures',
      value: totals.schedulerFailures || 0,
      helper: operations?.notificationRuns?.health?.lastRunAt
        ? `Last scheduled run ${new Date(operations.notificationRuns.health.lastRunAt).toLocaleString()}.`
        : 'No recent scheduler activity recorded.',
      tone: 'amber',
    },
    {
      title: 'Push Failures',
      value: totals.pushFailures || 0,
      helper: pushError
        ? `${pushError.error} surfaced ${pushError.count} time(s).`
        : 'No dominant push receipt error in this window.',
      tone: 'rose',
    },
    {
      title: 'Critical Alerts',
      value: totals.criticalAlerts || 0,
      helper: highestAttentionDay
        ? `${highestAttentionDay.label} carried the highest pressure day with ${highestAttentionDay.attentionSignals} attention signals.`
        : 'No alert pressure has been recorded yet.',
      tone: 'slate',
    },
    {
      title: 'Deploy Blockers',
      value: readinessBlockers,
      helper:
        readiness?.status === 'attention'
          ? `${readinessMissingEnv} required env gap(s) and ${readinessMissingProviders} review provider gap(s).`
          : 'Production readiness checks are currently aligned.',
      tone: readiness?.status === 'attention' ? 'rose' : 'emerald',
    },
  ];

  const spotlights = [
    {
      title: 'Review Sync Spotlight',
      value: reviewFailure
        ? `${labelizeOperationsValue(reviewFailure.platform)} needs attention`
        : reviewMonitoring.overdueRetries
          ? 'Review sync retries are overdue'
          : busiestPlatform?.attentionRequired
            ? `${labelizeOperationsValue(busiestPlatform.platform)} is showing pressure`
            : 'Review sync is stable',
      helper: reviewMonitoring.overdueRetries
        ? `${reviewMonitoring.overdueRetries} overdue retry item(s) and ${reviewMonitoring.schedulerFailures || 0} scheduler-triggered failure(s) need follow-up.`
        : reviewFailure?.error ||
          (busiestPlatform
            ? `${busiestPlatform.failed} failed run(s) in the current window.`
            : 'No recent provider sync failure has been recorded.'),
      tone: 'sky',
    },
    {
      title: 'Scheduler Spotlight',
      value: schedulerMonitoring.staleRunningCount
        ? 'Scheduler jobs appear stuck'
        : schedulerFailure
          ? `${labelizeOperationsValue(schedulerFailure.jobType)} failed most recently`
          : 'Scheduler runs are healthy',
      helper: schedulerMonitoring.staleRunningCount
        ? `${schedulerMonitoring.staleRunningCount} run(s) are past the stale-running threshold and the current failure streak is ${schedulerMonitoring.failureStreak || 0}.`
        : schedulerFailure?.error ||
          `Current scheduler attention: ${operations?.notificationRuns?.health?.attentionRequired || 0} active run issue(s).`,
      tone: 'amber',
    },
    {
      title: 'Push Spotlight',
      value:
        pushMonitoring.thresholdsExceeded?.invalidTokens || pushMonitoring.thresholdsExceeded?.stalePending || pushError
          ? 'Push delivery needs cleanup'
          : 'Push delivery is stable',
      helper:
        pushMonitoring.thresholdsExceeded?.invalidTokens || pushMonitoring.thresholdsExceeded?.stalePending
          ? `${operations?.push?.totals?.invalidTokens || 0} invalid token(s) and ${operations?.push?.totals?.stalePendingCount || 0} stale pending receipt(s) are above normal cleanup pressure.`
          : pushError
            ? `${pushError.error} appeared ${pushError.count} time(s).`
            : `${operations?.push?.totals?.deliveryRate || 0}% delivery rate across resolved push receipts.`,
      tone: 'rose',
    },
    {
      title: 'Readiness Spotlight',
      value:
        readiness?.status === 'attention'
          ? 'Deployment blockers still need cleanup'
          : 'Production readiness is aligned',
      helper:
        readiness?.status === 'attention'
          ? `${readinessBlockers} blocker group(s) remain active. Open /merxus/production-readiness to clear env, provider, script, or index gaps before the next rollout.`
          : 'Required runtime checks, audit scripts, and provider configuration are currently passing the shared readiness summary.',
      tone: 'rose',
    },
  ];

  const monitoringCards = [
    {
      title: 'Review Monitoring',
      value:
        reviewMonitoring.thresholdsExceeded?.criticalFailures || reviewMonitoring.thresholdsExceeded?.multiProviderFailures
          ? 'Threshold exceeded'
          : 'Within threshold',
      helper: `${reviewMonitoring.overdueRetries || 0} overdue retries • ${reviewMonitoring.schedulerFailures || 0} scheduler failures`,
      tone:
        reviewMonitoring.thresholdsExceeded?.criticalFailures || reviewMonitoring.thresholdsExceeded?.multiProviderFailures
          ? 'sky'
          : 'slate',
    },
    {
      title: 'Push Monitoring',
      value:
        pushMonitoring.thresholdsExceeded?.elevatedFailureRate || pushMonitoring.thresholdsExceeded?.invalidTokens
          ? 'Threshold exceeded'
          : 'Within threshold',
      helper: `${operations?.push?.totals?.failureRate || 0}% failure rate • ${operations?.push?.health?.categoriesWithPressure?.length || 0} category pressure point(s)`,
      tone:
        pushMonitoring.thresholdsExceeded?.elevatedFailureRate || pushMonitoring.thresholdsExceeded?.invalidTokens
          ? 'rose'
          : 'slate',
    },
    {
      title: 'Scheduler Monitoring',
      value:
        schedulerMonitoring.thresholdsExceeded?.staleRunning || schedulerMonitoring.thresholdsExceeded?.failureStreak
          ? 'Threshold exceeded'
          : 'Within threshold',
      helper: `${schedulerMonitoring.staleRunningCount || 0} stale-running job(s) • ${schedulerMonitoring.failureStreak || 0} recent failure streak`,
      tone:
        schedulerMonitoring.thresholdsExceeded?.staleRunning || schedulerMonitoring.thresholdsExceeded?.failureStreak
          ? 'amber'
          : 'slate',
    },
    {
      title: 'Readiness Monitoring',
      value: readiness?.status === 'attention' ? 'Needs operator review' : 'Within threshold',
      helper:
        readiness?.status === 'attention'
          ? `${readinessBlockers} blocker group(s) • ${readinessMissingEnv} required env gap(s) • ${readinessMissingProviders} provider gap(s)`
          : 'Deploy blockers are currently clear in the shared production-readiness snapshot.',
      tone: readiness?.status === 'attention' ? 'rose' : 'slate',
    },
  ];

  return {
    operations,
    readiness,
    daily,
    totals,
    highestAttentionDay,
    reviewFailure,
    schedulerFailure,
    pushError,
    busiestPlatform,
    maxSignals,
    reviewMonitoring,
    pushMonitoring,
    schedulerMonitoring,
    readinessBlockers,
    readinessMissingEnv,
    readinessMissingProviders,
    trendWindowDays: trends?.days || daily.length || 0,
    statCards,
    spotlights,
    monitoringCards,
  };
}
