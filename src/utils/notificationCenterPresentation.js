export function formatNotificationCenterTimestamp(value) {
  if (!value) return '—';

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleString();
  }

  const seconds = value?._seconds ?? value?.seconds ?? null;
  if (seconds) {
    return new Date(seconds * 1000).toLocaleString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }

  return '—';
}

export function getNotificationCenterStatusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'failed' || normalized === 'undelivered' || normalized === 'error') {
    return 'bg-red-100 text-red-700';
  }
  if (normalized === 'attention_required' || normalized === 'needs_attention') {
    return 'bg-rose-100 text-rose-700';
  }
  if (normalized === 'queued' || normalized === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === 'sent' || normalized === 'delivered') {
    return 'bg-green-100 text-green-700';
  }
  return 'bg-slate-100 text-slate-700';
}

export function getNotificationCenterAlertTone(severity) {
  if (severity === 'critical') {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (severity === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

export function labelForNotificationCenterJobType(jobType) {
  if (jobType === 'daily_digest') return 'Daily Digest';
  if (jobType === 'retry_failed_notifications') return 'Retry Sweep';
  if (jobType === 'alert_escalation') return 'Alert Escalation';
  if (jobType === 'speech_provider_health') return 'Speech Health';
  if (jobType === 'review_sync') return 'Review Sync';
  if (jobType === 'review_integration_health') return 'Review Health';
  return String(jobType || 'unknown').replace(/_/g, ' ');
}

export function formatNotificationCenterReasonLabel(value) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ');
}

export function getNotificationCenterPushHealthTone(status) {
  if (status === 'attention') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function getNotificationCenterAlertIssueSummary(alert = {}) {
  const failureCount = Number(alert?.consecutiveFailures || 0);
  if (failureCount > 0) {
    return `Consecutive failures: ${failureCount}`;
  }

  return (
    alert?.alertContext?.healthLabel ||
    formatNotificationCenterReasonLabel(
      alert?.alertContext?.reason || alert?.alertContext?.health || 'attention_required'
    )
  );
}

export function getNotificationCenterSpeechProviders(run) {
  return Array.isArray(run?.speech?.providers) ? run.speech.providers : [];
}

export function getNotificationCenterSpeechProviderCounts(run) {
  const providers = getNotificationCenterSpeechProviders(run);
  const selected = providers.filter((provider) => provider.selected);
  const unhealthy = providers.filter((provider) => provider.ok === false);
  const unhealthySelected = selected.filter((provider) => provider.ok === false);

  return {
    providers,
    selected,
    unhealthy,
    unhealthySelected,
  };
}

export function getNotificationCenterSpeechProviderTone(provider) {
  if (provider?.ok === false) {
    return 'bg-red-100 text-red-700';
  }

  if (provider?.ok === true) {
    return 'bg-green-100 text-green-700';
  }

  return 'bg-slate-100 text-slate-700';
}

export function isRetryableNotificationCenterEvent(event) {
  return (
    ['failed', 'undelivered', 'error'].includes(
      String(event?.latestRetryStatus || event?.status || '').toLowerCase()
    ) && !event?.retryOfEventId
  );
}
