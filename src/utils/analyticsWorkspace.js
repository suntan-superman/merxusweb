export function labelAnalyticsValue(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function compressAnalyticsTrendItems(items = [], metricKeys = [], preferredBuckets = 14) {
  if (!items.length || items.length <= preferredBuckets) {
    return items;
  }

  const bucketSize = Math.ceil(items.length / preferredBuckets);
  const numericKeys = metricKeys.filter(Boolean);
  const buckets = [];

  for (let index = 0; index < items.length; index += bucketSize) {
    const slice = items.slice(index, index + bucketSize);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const bucket = {
      date: `${first.date}-${last.date}`,
      label: slice.length > 1 ? `${first.label}-${last.label}` : first.label,
    };

    numericKeys.forEach((key) => {
      bucket[key] = slice.reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
    });

    buckets.push(bucket);
  }

  return buckets;
}

export function buildAnalyticsOverviewCards({ analytics, isTenantAnalytics }) {
  if (isTenantAnalytics) {
    return [
      {
        title: 'Invite Conversion',
        value: `${analytics?.feedback?.funnel?.reviewInviteConversionRate || 0}%`,
        helper: `${analytics?.feedback?.reviews?.total || 0} public reviews in window`,
      },
      {
        title: 'Recovery Resolution',
        value: `${analytics?.feedback?.recovery?.resolutionRate || 0}%`,
        helper: `${analytics?.feedback?.recovery?.resolved || 0} resolved • ${analytics?.feedback?.recovery?.open || 0} open`,
      },
      {
        title: 'Average Review',
        value: analytics?.feedback?.reviews?.averageRating ?? '—',
        helper: 'Imported public review rating',
      },
      {
        title: 'Sync Attention',
        value: analytics?.operations?.reviewSync?.health?.attentionRequired || 0,
        helper: `${analytics?.operations?.reviewSync?.pendingRetries?.length || 0} pending retries`,
      },
      {
        title: 'Push Delivery',
        value: `${analytics?.operations?.push?.totals?.deliveryRate || 0}%`,
        helper: `${analytics?.operations?.push?.totals?.invalidTokens || 0} invalid tokens`,
      },
      {
        title: 'Active Alerts',
        value: analytics?.operations?.alerts?.totals?.active || 0,
        helper: `${analytics?.operations?.alerts?.totals?.unowned || 0} unowned`,
      },
    ];
  }

  return [
    {
      title: 'Restaurants',
      value: analytics?.totalRestaurants || 0,
      helper: 'Active restaurant accounts',
    },
    {
      title: 'Active Users',
      value: analytics?.activeUsers || 0,
      helper: `${analytics?.totalUsers || 0} total users`,
    },
    {
      title: 'Active Alerts',
      value: analytics?.operations?.alerts?.totals?.active || 0,
      helper: `${analytics?.operations?.alerts?.totals?.critical || 0} critical`,
    },
    {
      title: 'Sync Attention',
      value: analytics?.operations?.reviewSync?.health?.attentionRequired || 0,
      helper: `${analytics?.operations?.reviewSync?.totals?.successRate || 0}% sync success`,
    },
    {
      title: 'Push Delivery',
      value: `${analytics?.operations?.push?.totals?.deliveryRate || 0}%`,
      helper: `${analytics?.operations?.push?.totals?.failed || 0} failed`,
    },
    {
      title: 'Scheduler Failures',
      value: analytics?.operations?.notificationRuns?.totals?.failed || 0,
      helper: `${analytics?.operations?.notificationRuns?.totals?.running || 0} running`,
    },
    {
      title: 'Deploy Blockers',
      value: analytics?.operations?.readiness?.deployBlockers?.length || 0,
      helper: `${analytics?.operations?.readiness?.env?.missingRequired?.length || 0} required env gap(s)`,
    },
  ];
}

export function buildAnalyticsExportRows({ analytics, isTenantAnalytics, windowDays }) {
  if (!analytics) return [];

  const scopeLabel = isTenantAnalytics
    ? labelAnalyticsValue(analytics?.tenantType || 'tenant')
    : 'system';
  const rows = [];
  const addRow = (row) => rows.push(row);

  addRow({
    section: 'overview',
    scope: scopeLabel,
    metric: 'reporting_window_days',
    value: windowDays,
  });

  if (isTenantAnalytics) {
    addRow({
      section: 'overview',
      scope: scopeLabel,
      metric: 'invite_conversion_rate',
      value: analytics?.feedback?.funnel?.reviewInviteConversionRate || 0,
    });
    addRow({
      section: 'overview',
      scope: scopeLabel,
      metric: 'recovery_resolution_rate',
      value: analytics?.feedback?.recovery?.resolutionRate || 0,
    });
    (analytics?.feedback?.reviews?.byPlatform || []).forEach((item) => {
      addRow({
        section: 'reviews_by_platform',
        scope: scopeLabel,
        metric: item.platform,
        value: item.count,
      });
    });
  } else {
    (analytics?.crossTenant?.byTenantType || []).forEach((item) => {
      addRow({
        section: 'cross_tenant',
        scope: item.label,
        metric: 'accounts',
        value: item.accounts || 0,
        attentionSignals: item.attentionSignals || 0,
        reviewSyncSuccessRate: item.reviewSyncSuccessRate || 0,
        pushDeliveryRate: item.pushDeliveryRate || 0,
        activeAlerts: item.activeAlerts || 0,
        topIssue: item.topIssue?.key || '',
        topIssueHeadline: item.topIssue?.headline || '',
        peakPressureDay: item.trend?.highestAttentionDay?.label || '',
        peakPressureSignals: item.trend?.highestAttentionDay?.attentionSignals || 0,
        strongestDay: item.trend?.strongestDay?.label || '',
        strongestDaySignals: item.trend?.strongestDay?.successSignals || 0,
      });

      (item.pressureSources || []).forEach((source) => {
        addRow({
          section: 'cross_tenant_pressure_sources',
          scope: item.label,
          metric: source.key,
          value: source.value || 0,
          severity: source.severity || 'healthy',
          helper: source.helper || '',
          route: source.route || '',
        });
      });
    });

    addRow({
      section: 'production_readiness',
      scope: 'system',
      metric: 'status',
      value: analytics?.operations?.readiness?.status || 'unknown',
      deployBlockers: analytics?.operations?.readiness?.deployBlockers?.length || 0,
      missingRequiredEnv: analytics?.operations?.readiness?.env?.missingRequired?.length || 0,
      missingProviderConfigs: analytics?.operations?.readiness?.reviewProviders?.missingRequiredProviders?.length || 0,
    });

    (analytics?.operations?.readiness?.deployBlockers || []).forEach((item) => {
      addRow({
        section: 'production_readiness_blockers',
        scope: 'system',
        metric: item.key,
        severity: item.severity || 'warning',
        value: item.count || 0,
        headline: item.headline || '',
      });
    });

    (analytics?.operations?.readiness?.operationalAuditCommands || []).forEach((command) => {
      addRow({
        section: 'production_readiness_commands',
        scope: 'system',
        metric: 'operational_audit_command',
        value: command,
      });
    });

    (analytics?.crossTenant?.remediationQueue || []).forEach((item) => {
      addRow({
        section: 'cross_tenant_remediation_queue',
        scope: item.label,
        metric: item.tenantType,
        value: item.attentionSignals || 0,
        severity: item.severity || 'healthy',
        headline: item.headline || '',
        peakPressureDay: item.peakAttentionDay?.label || '',
        analyticsRoute: item.route || '',
        opsAuditRoute: item.opsAuditRoute || '',
      });
    });
  }

  (analytics?.reporting?.history?.weekly || []).forEach((item) => {
    addRow({
      section: 'history',
      scope: scopeLabel,
      metric: item.label,
      successSignals: item.successSignals || 0,
      attentionSignals: item.attentionSignals || 0,
      pushFailures: item.pushFailures || 0,
      criticalAlerts: item.criticalAlerts || 0,
    });
  });

  (analytics?.reporting?.storylines || []).forEach((item) => {
    addRow({
      section: 'storyline',
      scope: scopeLabel,
      metric: item.title,
      tone: item.tone,
      description: item.description,
      route: item.route || '',
    });
  });

  return rows;
}
