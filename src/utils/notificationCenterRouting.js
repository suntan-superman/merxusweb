import { getPortalBasePath } from './objectRouting.js';

const DEFAULT_APP_ORIGIN = 'https://app.merxus.ai';
const REVIEW_ALERT_EVENT_TYPES = ['negative_review', 'review_spike', 'feedback_low_rating'];
const REVIEW_REMEDIATION_EVENT_TYPES = ['review_sync_failed'];

function firstNonEmptyValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function getAppOrigin() {
  return globalThis?.location?.origin || DEFAULT_APP_ORIGIN;
}

export function labelizeNotificationCenterValue(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function deriveRemediationFocus(reason, nextRetryAt) {
  const normalizedReason = String(reason || '').trim().toLowerCase();
  if (normalizedReason === 'awaiting_first_sync') return 'validation';
  if (normalizedReason === 'stale_connection') return 'provider_health';
  if (
    nextRetryAt ||
    ['sync_failed', 'provider_attention', 'sync_check_needed', 'needs_sync_confirmation'].includes(
      normalizedReason
    )
  ) {
    return 'sync_attention';
  }
  return '';
}

export function isNotificationReviewAlertEvent(event = {}) {
  return REVIEW_ALERT_EVENT_TYPES.includes(String(event?.eventType || '').toLowerCase());
}

export function isNotificationReviewRemediationEvent(event = {}) {
  return REVIEW_REMEDIATION_EVENT_TYPES.includes(String(event?.eventType || '').toLowerCase());
}

export function buildReviewDetailPath(tenantType, event = {}) {
  const portalBasePath = getPortalBasePath(tenantType);
  if (!portalBasePath) {
    return null;
  }

  const reviewId = firstNonEmptyValue(event?.reviewId, event?.rootEvent?.reviewId, event?.event?.reviewId);
  if (!reviewId) {
    return null;
  }

  return `${portalBasePath}/reviews?reviewId=${encodeURIComponent(reviewId)}`;
}

export function resolveFeedbackRecoveryId(event = {}) {
  return firstNonEmptyValue(
    event?.feedbackRecovery?.id,
    event?.rootEvent?.structuredData?.internalFeedbackId,
    event?.event?.structuredData?.internalFeedbackId,
    event?.structuredData?.internalFeedbackId
  );
}

export function buildFeedbackRecoveryPath(tenantType, event = {}) {
  const portalBasePath = getPortalBasePath(tenantType);
  const feedbackId = resolveFeedbackRecoveryId(event);
  if (!portalBasePath || !feedbackId) {
    return null;
  }
  return `${portalBasePath}/feedback?feedbackId=${encodeURIComponent(feedbackId)}`;
}

export function getReviewRemediationSummary(event = {}) {
  const platform = firstNonEmptyValue(
    event?.remediation?.platform,
    event?.platform,
    event?.alertContext?.platform,
    event?.rootEvent?.structuredData?.remediationPlatform,
    event?.event?.structuredData?.remediationPlatform,
    event?.structuredData?.remediationPlatform,
    event?.reviewPlatform,
    event?.rootEvent?.reviewPlatform,
    event?.event?.reviewPlatform
  );
  const reason = firstNonEmptyValue(
    event?.remediation?.reason,
    event?.alertContext?.reason,
    event?.rootEvent?.structuredData?.remediationReason,
    event?.event?.structuredData?.remediationReason,
    event?.structuredData?.remediationReason
  );
  const nextRetryAt = firstNonEmptyValue(
    event?.remediation?.nextRetryAt,
    event?.alertContext?.retryAt,
    event?.rootEvent?.structuredData?.nextRetryAt,
    event?.event?.structuredData?.nextRetryAt,
    event?.structuredData?.nextRetryAt
  );
  const message = firstNonEmptyValue(
    event?.remediation?.message,
    event?.alertContext?.error,
    event?.alertContext?.actionRequired,
    event?.rootEvent?.structuredData?.errorMessage,
    event?.event?.structuredData?.errorMessage,
    event?.structuredData?.errorMessage
  );

  if (!platform && !reason && !message && !nextRetryAt) {
    return null;
  }

  return {
    platform,
    reason,
    nextRetryAt,
    message,
  };
}

export function buildFeedbackIntegrationsPath(tenantType, event = {}) {
  const summary = getReviewRemediationSummary(event);
  const focus = deriveRemediationFocus(summary?.reason, summary?.nextRetryAt);
  const explicitPath = firstNonEmptyValue(
    event?.remediation?.path,
    event?.remediationPath,
    event?.rootEvent?.structuredData?.remediationPath,
    event?.event?.structuredData?.remediationPath,
    event?.structuredData?.remediationPath
  );

  if (explicitPath) {
    const url = new URL(explicitPath, getAppOrigin());
    if (focus && !url.searchParams.get('focus')) {
      url.searchParams.set('focus', focus);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const portalBasePath = getPortalBasePath(tenantType);
  if (!portalBasePath || !summary?.platform) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('platform', summary.platform);
  if (focus) {
    params.set('focus', focus);
  }

  return `${portalBasePath}/feedback/integrations?${params.toString()}`;
}

export function buildAlertRemediationPath(alert = {}) {
  const remediationPath = String(alert?.remediationPath || '').trim();
  if (!remediationPath) {
    return null;
  }

  try {
    const parsed = new URL(remediationPath, getAppOrigin());
    const pathname = String(parsed.pathname || '').toLowerCase();
    if (pathname.endsWith('/feedback/integrations')) {
      const summary = getReviewRemediationSummary(alert);
      const focus = deriveRemediationFocus(summary?.reason, summary?.nextRetryAt);
      if (focus && !parsed.searchParams.get('focus')) {
        parsed.searchParams.set('focus', focus);
      }
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return remediationPath;
  }
}

export function buildNotificationEventActionModel(tenantType, event = {}) {
  const reviewPath = buildReviewDetailPath(tenantType, event);
  const feedbackRecoveryPath = buildFeedbackRecoveryPath(tenantType, event);
  const feedbackIntegrationsPath = buildFeedbackIntegrationsPath(tenantType, event);
  const remediationSummary = getReviewRemediationSummary(event);

  return {
    reviewPath,
    feedbackRecoveryPath,
    feedbackIntegrationsPath,
    remediationSummary,
    canOpenReview: Boolean(isNotificationReviewAlertEvent(event) && reviewPath),
    canOpenRecovery: Boolean(feedbackRecoveryPath),
    canOpenIntegrations: Boolean(
      isNotificationReviewRemediationEvent(event) && feedbackIntegrationsPath
    ),
    integrationsLabel: remediationSummary?.platform
      ? `Open ${labelizeNotificationCenterValue(remediationSummary.platform)} Integrations`
      : 'Open Integrations',
    hasAnyAction: Boolean(reviewPath || feedbackRecoveryPath || feedbackIntegrationsPath),
  };
}

export function buildNotificationAlertInspectTarget(alert = {}) {
  if (alert?.lastObservedEventId) {
    return {
      type: 'event',
      id: alert.lastObservedEventId,
      label: 'Open Event',
    };
  }

  if (alert?.lastObservedRunId) {
    return {
      type: 'run',
      id: alert.lastObservedRunId,
      label: 'Open Run',
    };
  }

  return null;
}

export function buildNotificationSpeechRuntimePath(tenantType, jobType) {
  if (jobType !== 'speech_provider_health') {
    return null;
  }

  if (tenantType === 'restaurant') {
    return '/settings?tab=ai&panel=speech-runtime';
  }

  if (tenantType === 'real_estate') {
    return '/estate/settings?tab=ai&panel=speech-runtime';
  }

  if (tenantType === 'voice') {
    return '/voice/settings?tab=ai&panel=speech-runtime';
  }

  return null;
}

export function buildNotificationCustomer360Path(tenantType, customerId, options = {}) {
  if (!customerId) return null;

  let basePath = null;
  if (tenantType === 'restaurant') basePath = `/restaurant/customer-360/${customerId}`;
  if (tenantType === 'real_estate') basePath = `/estate/customer-360/${customerId}`;
  if (tenantType === 'voice') basePath = `/voice/customer-360/${customerId}`;
  if (!basePath) return null;

  const searchParams = new URLSearchParams();
  if (options.section) {
    searchParams.set('section', options.section);
  }
  if (options.focusId) {
    searchParams.set('focusId', options.focusId);
  }

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function resolveNotificationCustomer360ObjectTarget(graphRefs = {}) {
  const candidates = [
    { key: 'showingId', section: 'showings', label: 'Open Showing' },
    { key: 'reservationId', section: 'reservations', label: 'Open Reservation' },
    { key: 'orderId', section: 'orders', label: 'Open Order' },
    { key: 'appointmentId', section: 'appointments', label: 'Open Appointment' },
    { key: 'quoteId', section: 'quotes', label: 'Open Quote' },
    { key: 'serviceRequestId', section: 'serviceRequests', label: 'Open Service Request' },
    { key: 'propertyId', section: 'properties', label: 'Open Property' },
  ];

  const match = candidates.find((candidate) => graphRefs?.[candidate.key]);
  if (!match) {
    return null;
  }

  return {
    section: match.section,
    focusId: graphRefs[match.key],
    label: match.label,
  };
}

export function buildNotificationCustomer360Target(tenantType, graphRefs = {}) {
  const customerId = graphRefs?.customerId;
  if (!customerId) {
    return null;
  }

  const linkedObject = resolveNotificationCustomer360ObjectTarget(graphRefs);
  return {
    customerId,
    linkedObject,
    label: linkedObject?.label || 'Open Customer 360',
    path: buildNotificationCustomer360Path(tenantType, customerId, linkedObject || {}),
  };
}

export function buildNotificationSourceSurfacePath(tenantType, interactionEvent = {}) {
  return buildNotificationSourceSurfaceTarget(tenantType, interactionEvent)?.path || null;
}

export function buildNotificationSourceSurfaceTarget(tenantType, interactionEvent = {}) {
  if (!interactionEvent?.sourceType) {
    return null;
  }

  const portalBasePath = getPortalBasePath(tenantType);
  if (!portalBasePath) {
    return null;
  }

  if (interactionEvent.sourceType === 'call_session') {
    const callId = interactionEvent.sourceRefId;
    if (!callId) {
      return null;
    }
    return {
      label: 'Open Calls & Messages',
      path: `${portalBasePath}/calls?callId=${encodeURIComponent(callId)}`,
    };
  }

  if (interactionEvent.sourceType === 'sms_message') {
    const contactPhone =
      interactionEvent.customer?.phone ||
      interactionEvent.customer?.mobile ||
      interactionEvent.customer?.contactPhone;
    if (!contactPhone) {
      return null;
    }

    const nextParams = new URLSearchParams();
    nextParams.set('contactPhone', contactPhone);
    if (interactionEvent.sourceRefId) {
      nextParams.set('messageSid', interactionEvent.sourceRefId);
    }
    return {
      label: 'Open SMS Inbox',
      path: `${portalBasePath}/sms?${nextParams.toString()}`,
    };
  }

  return null;
}
