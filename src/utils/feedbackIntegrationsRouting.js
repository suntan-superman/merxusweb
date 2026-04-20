export function labelize(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function platformDisplayName(platform) {
  if (platform === 'google') return 'Google Business Profile';
  if (platform === 'trustpilot') return 'Trustpilot';
  if (platform === 'facebook') return 'Facebook';
  return 'Review platform';
}

export function remediationFocusLabel(value) {
  if (value === 'validation') return 'Validation';
  if (value === 'provider_health') return 'Provider Health';
  if (value === 'sync_attention') return 'Sync Attention';
  return labelize(value || 'provider');
}

export function sortFeedbackIntegrations(integrations = [], focusPlatform = '') {
  const current = Array.isArray(integrations) ? [...integrations] : [];

  current.sort((left, right) => {
    const leftFocused = left.key === focusPlatform ? 1 : 0;
    const rightFocused = right.key === focusPlatform ? 1 : 0;
    if (leftFocused !== rightFocused) return rightFocused - leftFocused;

    const leftAttention = left.health === 'attention' || left.health === 'stale' ? 1 : 0;
    const rightAttention = right.health === 'attention' || right.health === 'stale' ? 1 : 0;
    if (leftAttention !== rightAttention) return rightAttention - leftAttention;

    return String(left.label || '').localeCompare(String(right.label || ''));
  });

  return current;
}

export function buildFeedbackRemediationHighlights({
  integrations = [],
  syncRunAnalytics = null,
  validationByPlatform = {},
} = {}) {
  const items = [];

  if ((syncRunAnalytics?.overdueRetries || []).length) {
    items.push({
      key: 'overdue_retries',
      tone: 'critical',
      title: 'Overdue review-sync retries need operator follow-up',
      body: `${syncRunAnalytics.overdueRetries.length} retry item(s) are overdue across live providers.`,
      helper:
        syncRunAnalytics?.health?.remediationHint ||
        'Open the affected provider and inspect retry guidance.',
    });
  }

  const pendingRetryProviders = (Array.isArray(integrations) ? integrations : []).filter(
    (integration) => Number(integration.pendingRetryCount || 0) > 0
  );
  if (pendingRetryProviders.length) {
    items.push({
      key: 'provider_retries',
      tone: 'warning',
      title: 'Connected providers still have pending retry pressure',
      body: `${pendingRetryProviders.length} integration(s) still have retry backlog.`,
      helper: 'Focus a provider card below to confirm sync or clear attention.',
    });
  }

  const validationIssues = Object.values(validationByPlatform || {}).filter(
    (item) => (item?.missingScopes || []).length > 0 || item?.liveCheck?.ok === false
  );
  if (validationIssues.length) {
    items.push({
      key: 'validation',
      tone: 'warning',
      title: 'Validation is showing scope or provider issues',
      body: 'At least one live provider needs reconnect, permission review, or credential attention.',
      helper:
        'Use the provider validation panels below to inspect the exact missing scope or live-check message.',
    });
  }

  return items;
}

export function buildFeedbackFocusNotice({
  focusPlatform = '',
  remediationFocus = '',
} = {}) {
  const platform = String(focusPlatform || '').trim().toLowerCase();
  const focus = String(remediationFocus || '').trim().toLowerCase();

  if (!platform && !focus) {
    return '';
  }

  const parts = [
    platform
      ? `${platformDisplayName(platform)} is highlighted below.`
      : 'A remediation focus is highlighted below.',
  ];

  if (focus) {
    parts.push(`Focus: ${remediationFocusLabel(focus)}.`);
  }

  return parts.join(' ').trim();
}

export function buildValidationFallback(validationError) {
  return {
    success: false,
    status: 'attention',
    connectionStatus: 'provider_error',
    liveCheck: {
      ok: false,
      message:
        validationError?.response?.data?.error ||
        validationError?.message ||
        'Validation failed.',
    },
    warnings: [],
    recommendedActions: ['Retry validation or reconnect the provider.'],
    issues: [],
    attentionReasons: ['provider_error'],
    primaryIssueCode: 'provider_error',
    primaryAction: 'Retry validation or reconnect the provider.',
    remediation: {
      issueCode: 'provider_error',
      focus: 'provider',
      urgency: 'high',
      primaryAction: 'Retry validation or reconnect the provider.',
      nextSteps: ['Retry validation or reconnect the provider.'],
      routeHint: 'feedback_integrations',
    },
  };
}
