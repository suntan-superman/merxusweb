import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  acknowledgeSmsNotificationRunAlert,
  addSmsNotificationRunAlertNote,
  claimSmsNotificationRunAlert,
  escalateSmsNotificationRunAlerts,
  fetchSmsDailyDigest,
  fetchSmsNotificationEventDetail,
  fetchSmsNotificationEvents,
  fetchSmsNotificationJobRunDetail,
  fetchSmsNotificationJobRuns,
  fetchSmsNotificationRunAlertAnalytics,
  fetchSmsNotificationRunAlerts,
  resumeSmsNotificationRunAlert,
  releaseSmsNotificationRunAlert,
  runSmsSpeechHealthMonitor,
  retryFailedSmsNotificationEvents,
  retrySmsNotificationEvent,
  retrySmsNotificationEventsBatch,
  snoozeSmsNotificationRunAlert,
} from '../../api/sms';
import { getNativeObjectRoute, getPortalBasePath } from '../../utils/objectRouting';
import SelectField from '../common/SelectField';

function formatTimestamp(value) {
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

function toneForStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'failed' || normalized === 'undelivered' || normalized === 'error') {
    return 'bg-red-100 text-red-700';
  }
  if (normalized === 'queued' || normalized === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === 'sent' || normalized === 'delivered') {
    return 'bg-green-100 text-green-700';
  }
  return 'bg-slate-100 text-slate-700';
}

function getAlertTone(severity) {
  if (severity === 'critical') {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (severity === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

function labelForJobType(jobType) {
  if (jobType === 'daily_digest') return 'Daily Digest';
  if (jobType === 'retry_failed_notifications') return 'Retry Sweep';
  if (jobType === 'alert_escalation') return 'Alert Escalation';
  if (jobType === 'speech_provider_health') return 'Speech Health';
  return String(jobType || 'unknown').replace(/_/g, ' ');
}

function formatReasonLabel(value) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ');
}

function getSpeechProviders(run) {
  return Array.isArray(run?.speech?.providers) ? run.speech.providers : [];
}

function getSpeechProviderCounts(run) {
  const providers = getSpeechProviders(run);
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

function getSpeechProviderTone(provider) {
  if (provider?.ok === false) {
    return 'bg-red-100 text-red-700';
  }

  if (provider?.ok === true) {
    return 'bg-green-100 text-green-700';
  }

  return 'bg-slate-100 text-slate-700';
}

function isRetryableEvent(event) {
  return (
    ['failed', 'undelivered', 'error'].includes(String(event?.latestRetryStatus || event?.status || '').toLowerCase()) &&
    !event?.retryOfEventId
  );
}

function getAlertInspectTarget(alert) {
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

function buildSpeechRuntimePath(tenantType, jobType) {
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

function buildCustomer360Path(tenantType, customerId, options = {}) {
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

function resolveCustomer360ObjectTarget(graphRefs = {}) {
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

function getCustomer360Target(tenantType, graphRefs = {}) {
  const customerId = graphRefs?.customerId;
  if (!customerId) {
    return null;
  }

  const linkedObject = resolveCustomer360ObjectTarget(graphRefs);
  return {
    customerId,
    linkedObject,
    label: linkedObject?.label || 'Open Customer 360',
    path: buildCustomer360Path(tenantType, customerId, linkedObject || {}),
  };
}

function formatGraphRefs(graphRefs = {}) {
  const entries = Object.entries(graphRefs).filter(([, value]) => value);
  if (!entries.length) {
    return '—';
  }

  return entries.map(([key, value]) => `${key}:${value}`).join(', ');
}

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Notification Center',
      subtitle: 'Audit confirmations, staff alerts, and delivery health for your restaurant communication flows.',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'Notification Center',
      subtitle: 'Track lead alerts, daily summaries, and delivery failures for your real estate automation.',
    };
  }
  return {
    title: 'Notification Center',
    subtitle: 'Track post-call alerts, daily summaries, and delivery failures for your office communication workflows.',
  };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'queued', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'All channels' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'caller', label: 'Caller' },
  { value: 'staff', label: 'Staff' },
  { value: 'staff_digest', label: 'Staff Digest' },
];

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All event types' },
  { value: 'daily_digest', label: 'Daily digest' },
  { value: 'reservation_confirmed', label: 'Reservation confirmed' },
  { value: 'order_confirmed', label: 'Order confirmed' },
  { value: 'support_request', label: 'Support request' },
  { value: 'appointment_request', label: 'Appointment request' },
  { value: 'quote_request', label: 'Quote request' },
  { value: 'listing_inquiry', label: 'Listing inquiry' },
  { value: 'showing_request', label: 'Showing request' },
  { value: 'buyer_lead', label: 'Buyer lead' },
  { value: 'seller_lead', label: 'Seller lead' },
  { value: 'property_question', label: 'Property question' },
  { value: 'automation_run_failure', label: 'Automation run failure' },
  { value: 'automation_run_failure_escalation', label: 'Automation alert escalation' },
];

export default function NotificationCenterWorkspace({ tenantType }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const copy = copyForTenant(tenantType);
  const requestedEventId = searchParams.get('eventId') || '';
  const requestedRunId = searchParams.get('runId') || '';
  const requestedInteractionEventId = searchParams.get('interactionEventId') || '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [jobRuns, setJobRuns] = useState([]);
  const [runAlerts, setRunAlerts] = useState([]);
  const [runAlertAnalytics, setRunAlertAnalytics] = useState(null);
  const [digestSummary, setDigestSummary] = useState(null);
  const [filters, setFilters] = useState({
    days: 30,
    channel: '',
    recipientRole: '',
    eventType: '',
    status: '',
    search: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryingEventId, setRetryingEventId] = useState('');
  const [runningRetrySweep, setRunningRetrySweep] = useState(false);
  const [runningAlertEscalation, setRunningAlertEscalation] = useState(false);
  const [runningSpeechHealth, setRunningSpeechHealth] = useState(false);
  const [selectedJobRunId, setSelectedJobRunId] = useState('');
  const [selectedJobRunDetail, setSelectedJobRunDetail] = useState(null);
  const [loadingJobRunDetail, setLoadingJobRunDetail] = useState(false);
  const [runningJobRunRetry, setRunningJobRunRetry] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);
  const [alertActionId, setAlertActionId] = useState('');
  const [alertNotes, setAlertNotes] = useState({});

  function upsertRunAlert(nextAlert) {
    setRunAlerts((current) =>
      current.map((alert) => (alert.id === nextAlert.id ? { ...alert, ...nextAlert } : alert))
    );
  }

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [eventsData, jobRunsData, runAlertsData, runAlertAnalyticsData, digestData] = await Promise.all([
        fetchSmsNotificationEvents({
          limit: 250,
          days: filters.days,
          channel: filters.channel || undefined,
          recipientRole: filters.recipientRole || undefined,
          eventType: filters.eventType || undefined,
          status: filters.status || undefined,
          interactionEventId: requestedInteractionEventId || undefined,
        }),
        fetchSmsNotificationJobRuns({
          limit: 50,
          days: filters.days,
        }),
        fetchSmsNotificationRunAlerts({
          limit: 10,
          days: filters.days,
          status: 'active',
        }),
        fetchSmsNotificationRunAlertAnalytics(filters.days, 200),
        fetchSmsDailyDigest(1),
      ]);

      setEvents(eventsData.events || []);
      setJobRuns(jobRunsData.runs || []);
      setRunAlerts(runAlertsData.alerts || []);
      setRunAlertAnalytics(runAlertAnalyticsData.analytics || null);
      setDigestSummary(digestData.summary || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || 'Failed to load notification events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filters.days, filters.channel, filters.recipientRole, filters.eventType, filters.status, requestedInteractionEventId]);

  const visibleEvents = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    if (!needle) return events;

    return events.filter((event) => {
      const haystack = [
        event.eventType,
        event.status,
        event.channel,
        event.recipientRole,
        event.to,
        event.toUserId,
        event.callSessionId,
        event.recipientId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [events, filters.search]);

  const summary = useMemo(() => {
    const failed = visibleEvents.filter((event) => ['failed', 'undelivered', 'error'].includes(String(event.status || '').toLowerCase())).length;
    const queued = visibleEvents.filter((event) => ['queued', 'pending'].includes(String(event.status || '').toLowerCase())).length;
    const digestEvents = visibleEvents.filter((event) => event.eventType === 'daily_digest').length;
    const failedRuns = jobRuns.filter((run) => String(run.status || '').toLowerCase() === 'failed').length;
    const activeRunAlerts = runAlerts.length;

    return [
      { label: 'Visible events', value: visibleEvents.length },
      { label: 'Failures', value: failed },
      { label: 'Queued', value: queued },
      { label: 'Daily digests', value: digestEvents },
      { label: 'Failed automation runs', value: failedRuns },
      { label: 'Active automation alerts', value: activeRunAlerts },
    ];
  }, [visibleEvents, jobRuns, runAlerts]);

  const latestJobRuns = useMemo(() => {
    const latestDigest = jobRuns.find((run) => run.jobType === 'daily_digest') || null;
    const latestRetry = jobRuns.find((run) => run.jobType === 'retry_failed_notifications') || null;
    const latestEscalation = jobRuns.find((run) => run.jobType === 'alert_escalation') || null;
    const latestSpeech = jobRuns.find((run) => run.jobType === 'speech_provider_health') || null;
    return [latestDigest, latestRetry, latestEscalation, latestSpeech].filter(Boolean);
  }, [jobRuns]);

  const selectedJobRun = selectedJobRunDetail?.run || null;
  const selectedJobRunIsSpeechHealth = selectedJobRun?.jobType === 'speech_provider_health';
  const selectedSpeechProviderCounts = useMemo(
    () => getSpeechProviderCounts(selectedJobRun),
    [selectedJobRun]
  );
  const selectedEventCustomerTarget = useMemo(
    () => getCustomer360Target(tenantType, selectedEventDetail?.interactionEvent?.graphRefs || {}),
    [selectedEventDetail?.interactionEvent?.graphRefs, tenantType]
  );
  const selectedEventNativeObjectTarget = useMemo(
    () => getNativeObjectRoute(tenantType, selectedEventDetail?.interactionEvent?.graphRefs || {}),
    [selectedEventDetail?.interactionEvent?.graphRefs, tenantType]
  );

  useEffect(() => {
    if (!requestedEventId) {
      return;
    }
    handleInspectEvent(requestedEventId);
  }, [requestedEventId]);

  useEffect(() => {
    if (!requestedRunId) {
      return;
    }
    handleInspectJobRun(requestedRunId);
  }, [requestedRunId]);

  useEffect(() => {
    if (requestedEventId || !requestedInteractionEventId || selectedEventId || visibleEvents.length !== 1) {
      return;
    }
    handleInspectEvent(visibleEvents[0].id);
  }, [requestedEventId, requestedInteractionEventId, selectedEventId, visibleEvents]);

  async function loadJobRunDetail(runId) {
    const detail = await fetchSmsNotificationJobRunDetail(runId, 50);
    setSelectedJobRunDetail(detail);
    return detail;
  }

  async function loadEventDetail(eventId) {
    const detail = await fetchSmsNotificationEventDetail(eventId, 25);
    setSelectedEventDetail(detail);
    return detail;
  }

  async function handleRetry(eventId) {
    try {
      setRetryingEventId(eventId);
      setError('');
      setSuccess('');
      await retrySmsNotificationEvent(eventId);
      await loadData({ silent: true });
      if (selectedJobRunId && selectedJobRunDetail?.relatedEvents?.some((event) => event.id === eventId)) {
        setLoadingJobRunDetail(true);
        await loadJobRunDetail(selectedJobRunId);
      }
      if (
        selectedEventId &&
        (
          selectedEventId === eventId ||
          selectedEventDetail?.retryTimeline?.some((event) => event.id === eventId)
        )
      ) {
        setLoadingEventDetail(true);
        await loadEventDetail(selectedEventId);
      }
      setSuccess('Notification retry queued.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (retryError) {
      setError(retryError?.response?.data?.error || 'Failed to retry notification event.');
    } finally {
      setRetryingEventId('');
      setLoadingJobRunDetail(false);
      setLoadingEventDetail(false);
    }
  }

  async function handleRetrySweep() {
    try {
      setRunningRetrySweep(true);
      setError('');
      setSuccess('');
      const result = await retryFailedSmsNotificationEvents({ limit: 25 });
      await loadData({ silent: true });
      if (selectedEventId) {
        setLoadingEventDetail(true);
        await loadEventDetail(selectedEventId);
      }
      if (result.candidates > 0) {
        setSuccess(`Retry pass processed ${result.processed} of ${result.candidates} candidate events.`);
      } else {
        setSuccess('Retry pass found no eligible failed notifications.');
      }
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (retryError) {
      setError(retryError?.response?.data?.error || 'Failed to process notification retry pass.');
    } finally {
      setRunningRetrySweep(false);
      setLoadingEventDetail(false);
    }
  }

  async function handleAlertEscalationSweep() {
    try {
      setRunningAlertEscalation(true);
      setError('');
      setSuccess('');
      const result = await escalateSmsNotificationRunAlerts({ force: true, limit: 25 });
      await loadData({ silent: true });
      if (result.candidates > 0) {
        setSuccess(`Alert escalation pass escalated ${result.escalatedCount} of ${result.candidates} eligible alerts.`);
      } else {
        setSuccess('Alert escalation pass found no eligible automation alerts.');
      }
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (escalationError) {
      setError(escalationError?.response?.data?.error || 'Failed to process automation alert escalation.');
    } finally {
      setRunningAlertEscalation(false);
    }
  }

  async function handleSpeechHealthSweep() {
    try {
      setRunningSpeechHealth(true);
      setError('');
      setSuccess('');
      const result = await runSmsSpeechHealthMonitor({ force: true });
      await loadData({ silent: true });
      if (result.failedTenants > 0) {
        setSuccess(`Speech health pass detected issues for ${result.failedTenants} tenant run${result.failedTenants === 1 ? '' : 's'}.`);
      } else if (result.processedTenants > 0) {
        setSuccess(`Speech health pass completed successfully for ${result.processedTenants} tenant run${result.processedTenants === 1 ? '' : 's'}.`);
      } else {
        setSuccess('Speech health pass found no eligible voice runtime targets.');
      }
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (speechError) {
      setError(speechError?.response?.data?.error || 'Failed to run speech health monitor.');
    } finally {
      setRunningSpeechHealth(false);
    }
  }

  async function handleInspectJobRun(runId) {
    try {
      setSelectedJobRunId(runId);
      setLoadingJobRunDetail(true);
      setError('');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('runId', runId);
      setSearchParams(nextParams);
      await loadJobRunDetail(runId);
    } catch (detailError) {
      setError(detailError?.response?.data?.error || 'Failed to load automation run detail.');
      setSelectedJobRunDetail(null);
    } finally {
      setLoadingJobRunDetail(false);
    }
  }

  async function handleRetryJobRunEvents() {
    const retryableEventIds = (selectedJobRunDetail?.relatedEvents || [])
      .filter((event) => isRetryableEvent(event))
      .map((event) => event.id);

    if (!retryableEventIds.length) {
      setSuccess('No eligible failed events were found for this automation run.');
      window.setTimeout(() => setSuccess(''), 2500);
      return;
    }

    try {
      setRunningJobRunRetry(true);
      setError('');
      setSuccess('');
      const result = await retrySmsNotificationEventsBatch({
        eventIds: retryableEventIds,
        limit: retryableEventIds.length,
      });
      await loadData({ silent: true });
      if (selectedEventId) {
        setLoadingEventDetail(true);
        await loadEventDetail(selectedEventId);
      }
      if (selectedJobRunId) {
        setLoadingJobRunDetail(true);
        await loadJobRunDetail(selectedJobRunId);
      }
      setSuccess(`Bulk retry processed ${result.processed} of ${result.attempted} eligible events.`);
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (retryError) {
      setError(retryError?.response?.data?.error || 'Failed to retry related automation events.');
    } finally {
      setRunningJobRunRetry(false);
      setLoadingJobRunDetail(false);
      setLoadingEventDetail(false);
    }
  }

  async function handleInspectEvent(eventId) {
    try {
      setSelectedEventId(eventId);
      setLoadingEventDetail(true);
      setError('');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('eventId', eventId);
      setSearchParams(nextParams);
      await loadEventDetail(eventId);
    } catch (detailError) {
      setError(detailError?.response?.data?.error || 'Failed to load notification event detail.');
      setSelectedEventDetail(null);
    } finally {
      setLoadingEventDetail(false);
    }
  }

  async function handleInspectAlert(alert) {
    const target = getAlertInspectTarget(alert);
    if (!target?.id) {
      return;
    }

    if (target.type === 'event') {
      await handleInspectEvent(target.id);
      return;
    }

    await handleInspectJobRun(target.id);
  }

  function handleOpenVoiceRuntime(jobType) {
    const targetPath = buildSpeechRuntimePath(tenantType, jobType);
    if (!targetPath) {
      return;
    }
    navigate(targetPath);
  }

  function handleOpenCustomer360(customerId, options = {}) {
    const targetPath = buildCustomer360Path(tenantType, customerId, options);
    if (!targetPath) return;
    navigate(targetPath);
  }

  function handleOpenNativeObject(graphRefs = {}) {
    const targetPath = getNativeObjectRoute(tenantType, graphRefs);
    if (!targetPath?.path) {
      return;
    }
    navigate(targetPath.path);
  }

  function handleOpenSourceSurface(interactionEvent) {
    if (!interactionEvent?.sourceType) {
      return;
    }

    const portalBasePath = getPortalBasePath(tenantType);
    if (!portalBasePath) {
      return;
    }

    if (interactionEvent.sourceType === 'call_session') {
      const callId = interactionEvent.sourceRefId;
      if (!callId) {
        return;
      }
      navigate(`${portalBasePath}/calls?callId=${encodeURIComponent(callId)}`);
      return;
    }

    if (interactionEvent.sourceType === 'sms_message') {
      const contactPhone =
        interactionEvent.customer?.phone ||
        interactionEvent.customer?.mobile ||
        interactionEvent.customer?.contactPhone;
      if (!contactPhone) {
        return;
      }
      const nextParams = new URLSearchParams();
      nextParams.set('contactPhone', contactPhone);
      if (interactionEvent.sourceRefId) {
        nextParams.set('messageSid', interactionEvent.sourceRefId);
      }
      navigate(`${portalBasePath}/sms?${nextParams.toString()}`);
    }
  }

  async function handleAcknowledgeAlert(alertId) {
    try {
      setAlertActionId(`ack:${alertId}`);
      setError('');
      setSuccess('');
      const result = await acknowledgeSmsNotificationRunAlert(alertId);
      if (result.alert) {
        upsertRunAlert(result.alert);
      }
      setSuccess('Automation alert acknowledged.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || 'Failed to acknowledge automation alert.');
    } finally {
      setAlertActionId('');
    }
  }

  async function handleSnoozeAlert(alertId, hours = 4) {
    try {
      setAlertActionId(`snooze:${alertId}`);
      setError('');
      setSuccess('');
      const result = await snoozeSmsNotificationRunAlert(alertId, { hours });
      if (result.alert) {
        upsertRunAlert(result.alert);
      }
      setSuccess(`Automation alert snoozed for ${hours} hours.`);
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || 'Failed to snooze automation alert.');
    } finally {
      setAlertActionId('');
    }
  }

  async function handleResumeAlert(alertId) {
    try {
      setAlertActionId(`resume:${alertId}`);
      setError('');
      setSuccess('');
      const result = await resumeSmsNotificationRunAlert(alertId);
      if (result.alert) {
        upsertRunAlert(result.alert);
      }
      setSuccess('Automation alert resumed.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || 'Failed to resume automation alert.');
    } finally {
      setAlertActionId('');
    }
  }

  async function handleClaimAlert(alertId) {
    try {
      setAlertActionId(`claim:${alertId}`);
      setError('');
      setSuccess('');
      const result = await claimSmsNotificationRunAlert(alertId);
      if (result.alert) {
        upsertRunAlert(result.alert);
      }
      setSuccess('Automation alert claimed.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || 'Failed to claim automation alert.');
    } finally {
      setAlertActionId('');
    }
  }

  async function handleReleaseAlert(alertId) {
    try {
      setAlertActionId(`release:${alertId}`);
      setError('');
      setSuccess('');
      const result = await releaseSmsNotificationRunAlert(alertId);
      if (result.alert) {
        upsertRunAlert(result.alert);
      }
      setSuccess('Automation alert released.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || 'Failed to release automation alert.');
    } finally {
      setAlertActionId('');
    }
  }

  async function handleAddAlertNote(alertId) {
    const text = String(alertNotes[alertId] || '').trim();
    if (!text) {
      setError('Add a short note before saving.');
      return;
    }

    try {
      setAlertActionId(`note:${alertId}`);
      setError('');
      setSuccess('');
      const result = await addSmsNotificationRunAlertNote(alertId, { text });
      if (result.alert) {
        upsertRunAlert(result.alert);
      }
      setAlertNotes((current) => ({ ...current, [alertId]: '' }));
      setSuccess('Automation alert note saved.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || 'Failed to save automation alert note.');
    } finally {
      setAlertActionId('');
    }
  }

  return (
      <section className="card">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => loadData({ silent: true })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={refreshing || runningRetrySweep}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {requestedInteractionEventId ? (
        <div className="mb-4 rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          Showing notification activity linked to interaction event <span className="font-mono">{requestedInteractionEventId}</span>.
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          {success}
        </div>
      ) : null}

      {digestSummary ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily Snapshot</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Calls</p>
              <p className="text-2xl font-semibold text-slate-900">{digestSummary.totals?.calls || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Notifications</p>
              <p className="text-2xl font-semibold text-slate-900">{digestSummary.totals?.notifications || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Suppressed</p>
              <p className="text-2xl font-semibold text-slate-900">{digestSummary.totals?.suppressed || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Window</p>
              <p className="text-sm font-medium text-slate-900">
                {digestSummary.window?.startDate === digestSummary.window?.endDate
                  ? digestSummary.window?.endDate
                  : `${digestSummary.window?.startDate || '—'} to ${digestSummary.window?.endDate || '—'}`}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-6">
        {summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Automation Runs</h3>
            <p className="mt-1 text-xs text-gray-500">
              Recent scheduler runs for digests, retry sweeps, alert escalations, and speech provider health. This is the fastest way to verify that automation is executing for this tenant.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">Window: last {filters.days} days</p>
            <button
              type="button"
              onClick={handleSpeechHealthSweep}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              disabled={runningSpeechHealth}
            >
              {runningSpeechHealth ? 'Running Speech Check...' : 'Run Speech Check'}
            </button>
            <button
              type="button"
              onClick={handleAlertEscalationSweep}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              disabled={runningAlertEscalation}
            >
              {runningAlertEscalation ? 'Running Escalation Pass...' : 'Run Escalation Pass'}
            </button>
          </div>
        </div>

        {runAlerts.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {runAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-lg border p-3 ${getAlertTone(alert.severity)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{alert.severity}</p>
                <p className="mt-1 text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm">{alert.message}</p>
                <p className="mt-2 text-xs opacity-80">
                  Job: {labelForJobType(alert.jobType)} • Consecutive failures: {alert.consecutiveFailures || 0}
                </p>
                {alert.isAcknowledged ? (
                  <p className="mt-2 text-xs opacity-80">
                    Acknowledged for current run
                  </p>
                ) : null}
                {alert.owner?.email || alert.owner?.name ? (
                  <p className="mt-1 text-xs opacity-80">
                    Owner: {alert.owner?.name || alert.owner?.email}
                  </p>
                ) : null}
                {alert.isSnoozed ? (
                  <p className="mt-1 text-xs opacity-80">
                    Snoozed until {formatTimestamp(alert.snoozedUntil)}
                  </p>
                ) : null}
                {alert.latestNote?.text ? (
                  <div className="mt-2 rounded-md border border-current/20 bg-white/50 p-2 text-xs">
                    <p className="font-medium">{alert.latestNote.author?.name || alert.latestNote.author?.email || 'Operator'}</p>
                    <p className="mt-1">{alert.latestNote.text}</p>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                {getAlertInspectTarget(alert) ? (
                  <button
                    type="button"
                    onClick={() => handleInspectAlert(alert)}
                    className="mt-3 rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                  >
                    {getAlertInspectTarget(alert)?.label}
                  </button>
                ) : null}
                  {buildSpeechRuntimePath(tenantType, alert.jobType) ? (
                    <button
                      type="button"
                      onClick={() => handleOpenVoiceRuntime(alert.jobType)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                    >
                      Open Speech Runtime
                    </button>
                  ) : null}
                  {!alert.isAcknowledged ? (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      disabled={alertActionId === `ack:${alert.id}`}
                    >
                      {alertActionId === `ack:${alert.id}` ? 'Saving...' : 'Acknowledge'}
                    </button>
                  ) : null}
                  {alert.isSnoozed ? (
                    <button
                      type="button"
                      onClick={() => handleResumeAlert(alert.id)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      disabled={alertActionId === `resume:${alert.id}`}
                    >
                      {alertActionId === `resume:${alert.id}` ? 'Saving...' : 'Resume'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSnoozeAlert(alert.id, 4)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      disabled={alertActionId === `snooze:${alert.id}`}
                    >
                      {alertActionId === `snooze:${alert.id}` ? 'Saving...' : 'Snooze 4h'}
                    </button>
                  )}
                  {alert.owner?.uid || alert.owner?.email ? (
                    <button
                      type="button"
                      onClick={() => handleReleaseAlert(alert.id)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      disabled={alertActionId === `release:${alert.id}`}
                    >
                      {alertActionId === `release:${alert.id}` ? 'Saving...' : 'Release'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleClaimAlert(alert.id)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      disabled={alertActionId === `claim:${alert.id}`}
                    >
                      {alertActionId === `claim:${alert.id}` ? 'Saving...' : 'Claim'}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    className="input-field !bg-white/80"
                    value={alertNotes[alert.id] || ''}
                    onChange={(event) =>
                      setAlertNotes((current) => ({
                        ...current,
                        [alert.id]: event.target.value,
                      }))
                    }
                    placeholder="Add triage note"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAlertNote(alert.id)}
                    className="self-start rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                    disabled={alertActionId === `note:${alert.id}`}
                  >
                    {alertActionId === `note:${alert.id}` ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {runAlertAnalytics ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Owned</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{runAlertAnalytics.totals?.owned || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Unowned</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{runAlertAnalytics.totals?.unowned || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Avg Unowned Age</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{runAlertAnalytics.unownedAges?.averageHours || 0}h</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Oldest Unowned</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{runAlertAnalytics.unownedAges?.oldestHours || 0}h</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">By Job Type</p>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {(runAlertAnalytics.jobTypeCounts || []).slice(0, 3).map((item) => (
                    <p key={item.jobType}>
                      {labelForJobType(item.jobType)}: {item.count}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top Owners</p>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {(runAlertAnalytics.ownerCounts || []).slice(0, 3).map((item) => (
                    <p key={item.owner}>
                      {item.owner}: {item.count}
                    </p>
                  ))}
                  {!(runAlertAnalytics.ownerCounts || []).length ? <p>No claimed alerts.</p> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {jobRuns.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No automation runs recorded in the selected window.</p>
        ) : (
          <>
            {latestJobRuns.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {latestJobRuns.map((run) => (
                  <div key={`${run.jobType}-${run.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{labelForJobType(run.jobType)}</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${toneForStatus(run.status)}`}>
                        {run.status || 'unknown'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <p>Ran: {formatTimestamp(run.createdAt)}</p>
                      <p>Triggered by: {run.triggeredBy || '—'}</p>
                      <p>Processed: {run.processed ?? run.resultCount ?? 0}</p>
                      <p>Candidates / recipients: {run.candidates ?? run.recipientCount ?? 0}</p>
                      {run.jobType === 'speech_provider_health' ? (
                        <>
                          <p>Reason: {formatReasonLabel(run.reason)}</p>
                          <p>
                            Selected unhealthy: {run.unhealthySelectedProviderCount || 0} / {run.selectedProviderCount || 0}
                          </p>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInspectJobRun(run.id)}
                      className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                      disabled={loadingJobRunDetail && selectedJobRunId === run.id}
                    >
                      {loadingJobRunDetail && selectedJobRunId === run.id ? 'Loading...' : 'Inspect'}
                    </button>
                    {buildSpeechRuntimePath(tenantType, run.jobType) ? (
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceRuntime(run.jobType)}
                        className="mt-2 rounded-md border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-white"
                      >
                        Open Speech Runtime
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Triggered By</th>
                    <th className="px-4 py-3">Processed</th>
                    <th className="px-4 py-3">Candidates / Recipients</th>
                    <th className="px-4 py-3">Local Date</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobRuns.slice(0, 12).map((run) => (
                    <tr key={run.id}>
                      <td className="px-4 py-3 text-gray-600">{formatTimestamp(run.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-900">{labelForJobType(run.jobType)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${toneForStatus(run.status)}`}>
                          {run.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{run.triggeredBy || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{run.processed ?? run.resultCount ?? 0}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {run.jobType === 'speech_provider_health'
                          ? `${run.unhealthySelectedProviderCount || 0} unhealthy / ${run.selectedProviderCount || 0} selected`
                          : run.candidates ?? run.recipientCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{run.localDate || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleInspectJobRun(run.id)}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          disabled={loadingJobRunDetail && selectedJobRunId === run.id}
                        >
                          {loadingJobRunDetail && selectedJobRunId === run.id ? 'Loading...' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedJobRunDetail ? (
        <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Run Drilldown</h3>
              <p className="mt-1 text-xs text-gray-600">
                {labelForJobType(selectedJobRunDetail.run?.jobType)} from {formatTimestamp(selectedJobRunDetail.run?.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedJobRunId('');
                setSelectedJobRunDetail(null);
              }}
              className="rounded-md border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-gray-600">
              {selectedJobRunIsSpeechHealth
                ? 'Inspect the selected speech providers, fallback readiness, and cached health probe results for this tenant voice runtime.'
                : 'Retry eligible related failures directly from this run to remediate a broken digest or retry pass without leaving the drilldown.'}
            </p>
            {selectedJobRunIsSpeechHealth && buildSpeechRuntimePath(tenantType, selectedJobRun?.jobType) ? (
              <button
                type="button"
                onClick={() => handleOpenVoiceRuntime(selectedJobRun?.jobType)}
                className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
              >
                Open Speech Runtime
              </button>
            ) : null}
            {!selectedJobRunIsSpeechHealth ? (
              <button
                type="button"
                onClick={handleRetryJobRunEvents}
                className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                disabled={runningJobRunRetry || loadingJobRunDetail}
              >
                {runningJobRunRetry ? 'Retrying Eligible Events...' : 'Retry Eligible Events'}
              </button>
            ) : null}
          </div>

          {selectedJobRunIsSpeechHealth ? (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-primary-100 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Selected Providers</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedSpeechProviderCounts.selected.length}</p>
                </div>
                <div className="rounded-lg border border-primary-100 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Selected Unhealthy</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedSpeechProviderCounts.unhealthySelected.length}</p>
                </div>
                <div className="rounded-lg border border-primary-100 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Unhealthy</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedSpeechProviderCounts.unhealthy.length}</p>
                </div>
                <div className="rounded-lg border border-primary-100 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Fallback Ready</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {selectedJobRun?.fallbackHealthy == null
                      ? '—'
                      : selectedJobRun.fallbackHealthy
                        ? 'Healthy'
                        : 'Unhealthy'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-primary-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Strategy</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>Requested strategy: {selectedJobRun?.speech?.strategy || '—'}</p>
                    <p>Realtime provider: {selectedJobRun?.speech?.realtimeProvider || '—'}</p>
                    <p>STT provider: {selectedJobRun?.speech?.sttProvider || '—'}</p>
                    <p>TTS provider: {selectedJobRun?.speech?.ttsProvider || '—'}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Health Outcome</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>Reason: {formatReasonLabel(selectedJobRun?.reason)}</p>
                    <p>Health gating: {selectedJobRun?.speech?.healthGatingEnabled ? 'Enabled' : 'Disabled'}</p>
                    <p>Fallback allowed: {selectedJobRun?.speech?.allowFallback === false ? 'No' : 'Yes'}</p>
                    <p>Run status: {selectedJobRun?.status || '—'}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-primary-100 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Related Events</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedJobRunDetail.relatedSummary?.total || 0}</p>
              </div>
              <div className="rounded-lg border border-primary-100 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Failures</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedJobRunDetail.relatedSummary?.failed || 0}</p>
              </div>
              <div className="rounded-lg border border-primary-100 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Queued</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedJobRunDetail.relatedSummary?.queued || 0}</p>
              </div>
            </div>
          )}

          {selectedJobRunIsSpeechHealth ? (
            selectedSpeechProviderCounts.providers.length ? (
              <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Selection</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Checked</th>
                      <th className="px-4 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedSpeechProviderCounts.providers.map((provider) => (
                      <tr key={`${provider.type}:${provider.name}`}>
                        <td className="px-4 py-3 text-gray-900">{provider.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 uppercase">{provider.type || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getSpeechProviderTone(provider)}`}>
                            {provider.ok === false ? 'unhealthy' : provider.ok === true ? 'healthy' : 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {provider.selected ? 'Selected' : provider.gatingRelevant ? 'Gating only' : 'Fallback'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{provider.source || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatTimestamp(provider.checkedAt)}</td>
                        <td className="px-4 py-3 text-gray-600">{provider.detail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-600">No provider health records were stored for this run.</p>
            )
          ) : selectedJobRunDetail.relatedEvents?.length ? (
            <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Retry Of</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedJobRunDetail.relatedEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3 text-gray-600">{formatTimestamp(event.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${toneForStatus(event.status)}`}>
                          {event.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{String(event.eventType || '—').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-600 uppercase">{event.channel || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{event.to || event.toUserId || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{event.retryOfEventId || '—'}</td>
                      <td className="px-4 py-3">
                        {isRetryableEvent(event) ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(event.id)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            disabled={retryingEventId === event.id}
                          >
                            {retryingEventId === event.id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">No directly related notification events were found for this run.</p>
          )}
        </div>
      ) : null}

      {selectedEventDetail ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Event Drilldown</h3>
              <p className="mt-1 text-xs text-gray-600">
                {String(selectedEventDetail.rootEvent?.eventType || 'event').replace(/_/g, ' ')} to{' '}
                {selectedEventDetail.rootEvent?.to || selectedEventDetail.rootEvent?.toUserId || '—'}
              </p>
            </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId('');
                  setSelectedEventDetail(null);
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete('eventId');
                  setSearchParams(nextParams);
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
              >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Timeline Events</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedEventDetail.retrySummary?.totalEvents || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Retry Attempts</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedEventDetail.retrySummary?.retryAttempts || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Latest Status</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {selectedEventDetail.retrySummary?.latestStatus || selectedEventDetail.event?.status || '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Related Runs</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {selectedEventDetail.relatedJobRunIds?.length ? selectedEventDetail.relatedJobRunIds.join(', ') : '—'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Structured Source</p>
              {selectedEventDetail.interactionEvent ? (
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p>Interaction event: {selectedEventDetail.interactionEvent.id}</p>
                  <p>Channel: {String(selectedEventDetail.interactionEvent.channel || '—').toUpperCase()}</p>
                  <p>Review status: {formatReasonLabel(selectedEventDetail.interactionEvent.reviewStatus)}</p>
                  <p>Customer: {selectedEventDetail.interactionEvent.customer?.name || selectedEventDetail.interactionEvent.customer?.phone || '—'}</p>
                  {selectedEventDetail.notificationContext?.objectSummary ? (
                    <p className="pt-1 text-sm font-medium text-gray-800">
                      {selectedEventDetail.notificationContext.objectSummary}
                    </p>
                  ) : null}
                  {selectedEventDetail.notificationContext?.summary ? (
                    <p className="pt-1 text-sm text-gray-700">{selectedEventDetail.notificationContext.summary}</p>
                  ) : null}
                  <p>
                    Graph refs:{' '}
                    {formatGraphRefs(selectedEventDetail.interactionEvent.graphRefs)}
                  </p>
                  {selectedEventCustomerTarget ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedEventNativeObjectTarget ? (
                        <button
                          type="button"
                          onClick={() => handleOpenNativeObject(selectedEventDetail.interactionEvent.graphRefs)}
                          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {selectedEventNativeObjectTarget.label}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleOpenSourceSurface(selectedEventDetail.interactionEvent)}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        {selectedEventDetail.interactionEvent.sourceType === 'sms_message' ? 'Open SMS Inbox' : 'Open Calls & Messages'}
                      </button>
                      {selectedEventCustomerTarget.linkedObject ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCustomer360(
                            selectedEventCustomerTarget.customerId,
                            selectedEventCustomerTarget.linkedObject
                          )}
                          className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                        >
                          {selectedEventCustomerTarget.label}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleOpenCustomer360(selectedEventCustomerTarget.customerId)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {selectedEventCustomerTarget.linkedObject ? 'Open Customer 360 Root' : 'Open Customer 360'}
                      </button>
                    </div>
                  ) : null}
                  {!selectedEventCustomerTarget && selectedEventDetail.interactionEvent?.sourceType ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedEventNativeObjectTarget ? (
                        <button
                          type="button"
                          onClick={() => handleOpenNativeObject(selectedEventDetail.interactionEvent.graphRefs)}
                          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {selectedEventNativeObjectTarget.label}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleOpenSourceSurface(selectedEventDetail.interactionEvent)}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        {selectedEventDetail.interactionEvent.sourceType === 'sms_message' ? 'Open SMS Inbox' : 'Open Calls & Messages'}
                      </button>
                    </div>
                  ) : null}
                  {!selectedEventCustomerTarget && !selectedEventDetail.interactionEvent?.sourceType && selectedEventNativeObjectTarget ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenNativeObject(selectedEventDetail.interactionEvent.graphRefs)}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        {selectedEventNativeObjectTarget.label}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No structured interaction event is linked to this notification.</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Retry Payload</p>
              <p className="mt-2 text-sm text-gray-700">
                {selectedEventDetail.rootEvent?.retryPayload?.body ||
                  selectedEventDetail.rootEvent?.retryPayload?.text ||
                  selectedEventDetail.rootEvent?.retryPayload?.html ||
                  'No retry payload stored for this event.'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Metadata</p>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p>Provider SID: {selectedEventDetail.event?.providerMessageSid || '—'}</p>
                <p>Call session: {selectedEventDetail.event?.callSessionId || '—'}</p>
                <p>Job run: {selectedEventDetail.event?.jobRunId || '—'}</p>
                <p>Latest retry event: {selectedEventDetail.latestRetryEvent?.id || '—'}</p>
              </div>
            </div>
          </div>

          {loadingEventDetail ? (
            <p className="mt-4 text-sm text-gray-500">Refreshing event detail...</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Attempt</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Retry Of</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(selectedEventDetail.retryTimeline || []).map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3 text-gray-600">{formatTimestamp(event.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-600">{event.retryAttempt || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${toneForStatus(event.latestRetryStatus || event.status)}`}>
                          {event.latestRetryStatus || event.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 uppercase">{event.channel || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{event.to || event.toUserId || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{event.retryOfEventId || '—'}</td>
                      <td className="px-4 py-3">
                        {isRetryableEvent(event) ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(event.id)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            disabled={retryingEventId === event.id}
                          >
                            {retryingEventId === event.id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <SelectField
          label="Window"
          value={filters.days}
          onChange={(nextValue) => setFilters((prev) => ({ ...prev, days: Number(nextValue) }))}
          options={[
            { value: 7, label: '7 days' },
            { value: 30, label: '30 days' },
            { value: 90, label: '90 days' },
          ]}
          labelClassName="text-xs font-semibold uppercase tracking-wide text-gray-500"
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(nextValue) => setFilters((prev) => ({ ...prev, status: nextValue }))}
          options={STATUS_OPTIONS.filter((option) => option.value !== '').map((option) => ({ value: option.value, label: option.label }))}
          placeholder="All statuses"
          labelClassName="text-xs font-semibold uppercase tracking-wide text-gray-500"
        />
        <SelectField
          label="Channel"
          value={filters.channel}
          onChange={(nextValue) => setFilters((prev) => ({ ...prev, channel: nextValue }))}
          options={CHANNEL_OPTIONS.filter((option) => option.value !== '').map((option) => ({ value: option.value, label: option.label }))}
          placeholder="All channels"
          labelClassName="text-xs font-semibold uppercase tracking-wide text-gray-500"
        />
        <SelectField
          label="Role"
          value={filters.recipientRole}
          onChange={(nextValue) => setFilters((prev) => ({ ...prev, recipientRole: nextValue }))}
          options={ROLE_OPTIONS.filter((option) => option.value !== '').map((option) => ({ value: option.value, label: option.label }))}
          placeholder="All roles"
          labelClassName="text-xs font-semibold uppercase tracking-wide text-gray-500"
        />
        <SelectField
          label="Event Type"
          value={filters.eventType}
          onChange={(nextValue) => setFilters((prev) => ({ ...prev, eventType: nextValue }))}
          options={EVENT_TYPE_OPTIONS.filter((option) => option.value !== '').map((option) => ({ value: option.value, label: option.label }))}
          placeholder="All event types"
          containerClassName="xl:col-span-2"
          labelClassName="text-xs font-semibold uppercase tracking-wide text-gray-500"
        />
      </div>

      <div className="mt-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Search</span>
          <input
            type="text"
            className="input-field"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search destination, event type, call SID, or recipient ID"
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Notification Events</h3>
            <p className="mt-1 text-xs text-gray-500">
              Delivery failures and queued events need operator attention. Sent and delivered events are logged for audit history.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetrySweep}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={runningRetrySweep}
          >
            {runningRetrySweep ? 'Running Retry Pass...' : 'Run Retry Pass'}
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading notification events...</p>
        ) : visibleEvents.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No notification events match the current filters.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Call Session</th>
                  <th className="px-4 py-3">Retries</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-gray-600">{formatTimestamp(event.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${toneForStatus(event.status)}`}>
                        {event.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{String(event.eventType || '—').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{event.recipientRole || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 uppercase">{event.channel || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{event.to || event.toUserId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{event.callSessionId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-xs">
                        <div>Attempted: {event.retryCount || 0}</div>
                        <div className="mt-1 text-gray-500">
                          Latest: {event.latestRetryStatus || '—'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleInspectEvent(event.id)}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          disabled={loadingEventDetail && selectedEventId === event.id}
                        >
                          {loadingEventDetail && selectedEventId === event.id ? 'Loading...' : 'Inspect'}
                        </button>
                        {['failed', 'undelivered', 'error'].includes(String(event.latestRetryStatus || event.status || '').toLowerCase()) && !event.retryOfEventId ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(event.id)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            disabled={retryingEventId === event.id}
                          >
                            {retryingEventId === event.id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
