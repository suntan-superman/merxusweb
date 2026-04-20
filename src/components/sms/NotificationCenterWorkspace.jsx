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
  fetchSmsPushHealth,
  resumeSmsNotificationRunAlert,
  releaseSmsNotificationRunAlert,
  runSmsSpeechHealthMonitor,
  retryFailedSmsNotificationEvents,
  retrySmsNotificationEvent,
  retrySmsNotificationEventsBatch,
  snoozeSmsNotificationRunAlert,
} from '../../api/sms';
import { getNativeObjectRoute } from '../../utils/objectRouting';
import {
  buildAlertRemediationPath,
  buildNotificationAlertInspectTarget,
  buildNotificationCustomer360Path,
  buildNotificationCustomer360Target,
  buildNotificationEventActionModel,
  buildNotificationSourceSurfaceTarget,
  buildNotificationSpeechRuntimePath,
  buildFeedbackIntegrationsPath,
  buildFeedbackRecoveryPath,
  buildReviewDetailPath,
  getReviewRemediationSummary,
  labelizeNotificationCenterValue,
} from '../../utils/notificationCenterRouting';
import {
  formatNotificationCenterReasonLabel,
  formatNotificationCenterTimestamp,
  getNotificationCenterAlertIssueSummary,
  getNotificationCenterAlertTone,
  getNotificationCenterPushHealthTone,
  getNotificationCenterSpeechProviderCounts,
  getNotificationCenterSpeechProviderTone,
  getNotificationCenterStatusTone,
  isRetryableNotificationCenterEvent,
  labelForNotificationCenterJobType,
} from '../../utils/notificationCenterPresentation';
import SelectField from '../common/SelectField';

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
  { value: 'slack', label: 'Slack' },
  { value: 'webhook', label: 'Webhook' },
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
  { value: 'negative_review', label: 'Negative review' },
  { value: 'review_spike', label: 'Review spike' },
  { value: 'review_sync_failed', label: 'Review sync failed' },
  { value: 'feedback_low_rating', label: 'Feedback low rating' },
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

const PUSH_DELIVERY_CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'leads', label: 'Leads' },
  { value: 'showings', label: 'Showings' },
  { value: 'callbacks', label: 'Callbacks' },
  { value: 'reviews', label: 'Reviews & Reputation' },
  { value: 'operations', label: 'Operations & Alerts' },
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
  const [pushHealth, setPushHealth] = useState(null);
  const [filters, setFilters] = useState({
    days: 30,
    channel: '',
    recipientRole: '',
    eventType: '',
    status: '',
    pushDeliveryCategory: '',
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

      const [eventsData, jobRunsData, runAlertsData, runAlertAnalyticsData, digestData, pushHealthData] = await Promise.all([
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
        fetchSmsPushHealth({
          days: filters.days,
          limit: 300,
          deliveryCategory: filters.pushDeliveryCategory || undefined,
        }),
      ]);

      setEvents(eventsData.events || []);
      setJobRuns(jobRunsData.runs || []);
      setRunAlerts(runAlertsData.alerts || []);
      setRunAlertAnalytics(runAlertAnalyticsData.analytics || null);
      setDigestSummary(digestData.summary || null);
      setPushHealth(pushHealthData.health || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || 'Failed to load notification events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [
    filters.days,
    filters.channel,
    filters.recipientRole,
    filters.eventType,
    filters.status,
    filters.pushDeliveryCategory,
    requestedInteractionEventId,
  ]);

  const visibleEvents = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    if (!needle) return events;

    return events.filter((event) => {
      const haystack = [
        event.eventType,
        event.status,
        event.channel,
        event.recipientRole,
        event.reviewerName,
        event.reviewPlatform,
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

  const activePushCategoryLabel = useMemo(() => {
    if (!filters.pushDeliveryCategory) {
      return 'All categories';
    }

    return (
      PUSH_DELIVERY_CATEGORY_OPTIONS.find(
        (option) => option.value === filters.pushDeliveryCategory
      )?.label || labelizeNotificationCenterValue(filters.pushDeliveryCategory)
    );
  }, [filters.pushDeliveryCategory]);

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
    () => getNotificationCenterSpeechProviderCounts(selectedJobRun),
    [selectedJobRun]
  );
  const selectedEventCustomerTarget = useMemo(
    () =>
      buildNotificationCustomer360Target(
        tenantType,
        selectedEventDetail?.interactionEvent?.graphRefs || {}
      ),
    [selectedEventDetail?.interactionEvent?.graphRefs, tenantType]
  );
  const selectedEventNativeObjectTarget = useMemo(
    () => getNativeObjectRoute(tenantType, selectedEventDetail?.interactionEvent?.graphRefs || {}),
    [selectedEventDetail?.interactionEvent?.graphRefs, tenantType]
  );
  const selectedEventSourceSurfaceTarget = useMemo(
    () =>
      buildNotificationSourceSurfaceTarget(
        tenantType,
        selectedEventDetail?.interactionEvent || {}
      ),
    [selectedEventDetail?.interactionEvent, tenantType]
  );
  const selectedEventActions = useMemo(
    () => buildNotificationEventActionModel(tenantType, selectedEventDetail || {}),
    [selectedEventDetail, tenantType]
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
      .filter((event) => isRetryableNotificationCenterEvent(event))
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
    const target = buildNotificationAlertInspectTarget(alert);
    if (!target?.id) {
      return;
    }

    if (target.type === 'event') {
      await handleInspectEvent(target.id);
      return;
    }

    await handleInspectJobRun(target.id);
  }

  function handleOpenAlertRemediation(alert) {
    const targetPath = buildAlertRemediationPath(alert);
    if (!targetPath) {
      return;
    }
    navigate(targetPath);
  }

  function handleOpenVoiceRuntime(jobType) {
    const targetPath = buildNotificationSpeechRuntimePath(tenantType, jobType);
    if (!targetPath) {
      return;
    }
    navigate(targetPath);
  }

  function handleOpenCustomer360(customerId, options = {}) {
    const targetPath = buildNotificationCustomer360Path(tenantType, customerId, options);
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

  function handleOpenReviewDetail(event) {
    const targetPath = buildReviewDetailPath(tenantType, event);
    if (!targetPath) {
      return;
    }
    navigate(targetPath);
  }

  function handleOpenFeedbackRecovery(event) {
    const targetPath = buildFeedbackRecoveryPath(tenantType, event);
    if (!targetPath) {
      return;
    }
    navigate(targetPath);
  }

  function handleOpenFeedbackIntegrations(event) {
    const targetPath = buildFeedbackIntegrationsPath(tenantType, event);
    if (!targetPath) {
      return;
    }
    navigate(targetPath);
  }

  function applyPushEventFilter(status = '', deliveryCategory = undefined) {
    setFilters((current) => ({
      ...current,
      channel: 'push',
      status,
      pushDeliveryCategory:
        deliveryCategory === undefined ? current.pushDeliveryCategory : deliveryCategory,
    }));
  }

  function handlePushDeliveryCategoryChange(nextCategory) {
    setFilters((current) => ({
      ...current,
      pushDeliveryCategory: nextCategory,
    }));
  }

  function handleOpenSourceSurface(interactionEvent) {
    const target = buildNotificationSourceSurfaceTarget(tenantType, interactionEvent);
    if (!target?.path) {
      return;
    }
    navigate(target.path);
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

      {pushHealth ? (
        <div className={`mt-6 rounded-xl border p-4 ${getNotificationCenterPushHealthTone(pushHealth.health?.status)}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Push Health</p>
              <h3 className="mt-1 text-base font-semibold">
                {pushHealth.health?.headline || 'Push delivery monitoring'}
              </h3>
              <p className="mt-1 text-sm opacity-90">
                {pushHealth.health?.remediationHint || 'Review receipt failures, invalid tokens, and recent push categories.'}
              </p>
              <p className="mt-2 text-xs font-medium opacity-75">
                Category focus: {activePushCategoryLabel}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 lg:w-[360px]">
              <SelectField
                label="Push category"
                value={filters.pushDeliveryCategory}
                onChange={handlePushDeliveryCategoryChange}
                options={PUSH_DELIVERY_CATEGORY_OPTIONS}
                placeholder="All push categories"
                labelClassName="text-xs font-semibold uppercase tracking-wide opacity-75"
                buttonClassName="border-current/20 bg-white/70"
                menuClassName="text-slate-700"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPushEventFilter('failed')}
                  className="rounded-md border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white"
                >
                  Filter Push Failures
                </button>
                <button
                  type="button"
                  onClick={() => applyPushEventFilter('')}
                  className="rounded-md border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white"
                >
                  Show All Push Events
                </button>
                {filters.pushDeliveryCategory ? (
                  <button
                    type="button"
                    onClick={() => handlePushDeliveryCategoryChange('')}
                    className="rounded-md border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white"
                  >
                    Clear Category Focus
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-lg border border-current/10 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Resolved Delivery</p>
              <p className="mt-2 text-2xl font-semibold">{pushHealth.totals?.deliveryRate || 0}%</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Delivered</p>
              <p className="mt-2 text-2xl font-semibold">{pushHealth.totals?.delivered || 0}</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Pending</p>
              <p className="mt-2 text-2xl font-semibold">{pushHealth.totals?.pending || 0}</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Failed</p>
              <p className="mt-2 text-2xl font-semibold">{pushHealth.totals?.failed || 0}</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Invalid Tokens</p>
              <p className="mt-2 text-2xl font-semibold">{pushHealth.totals?.invalidTokens || 0}</p>
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide opacity-70">Stale Pending</p>
              <p className="mt-2 text-2xl font-semibold">{pushHealth.totals?.stalePendingCount || 0}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <div className="rounded-lg border border-current/10 bg-white/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Top Error</p>
              <p className="mt-2">
                {pushHealth.topErrors?.[0]
                  ? `${pushHealth.topErrors[0].error} (${pushHealth.topErrors[0].count})`
                  : 'None'}
              </p>
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Pressure Categories</p>
              {(pushHealth.monitoring?.categoriesWithPressure || []).length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pushHealth.monitoring.categoriesWithPressure.map((item) => (
                    <button
                      key={`pressure-${item}`}
                      type="button"
                      onClick={() => applyPushEventFilter('failed', item)}
                      className="rounded-full border border-current/20 bg-white/80 px-2.5 py-1 text-xs font-medium hover:bg-white"
                    >
                      {labelizeNotificationCenterValue(item)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2">None</p>
              )}
            </div>
            <div className="rounded-lg border border-current/10 bg-white/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Failure Categories</p>
              {(pushHealth.health?.categoriesWithFailures || []).length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pushHealth.health.categoriesWithFailures.map((item) => (
                    <button
                      key={`failure-${item}`}
                      type="button"
                      onClick={() => applyPushEventFilter('failed', item)}
                      className="rounded-full border border-current/20 bg-white/80 px-2.5 py-1 text-xs font-medium hover:bg-white"
                    >
                      {labelizeNotificationCenterValue(item)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2">None</p>
              )}
            </div>
          </div>

          {(pushHealth.recentFailures || []).length ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {pushHealth.recentFailures.slice(0, 3).map((failure) => (
                <button
                  key={failure.id}
                  type="button"
                  onClick={() => applyPushEventFilter('failed', failure.deliveryCategory || '')}
                  className="rounded-lg border border-current/10 bg-white/70 p-3 text-left text-sm transition hover:bg-white"
                >
                  <p className="font-semibold">
                    {labelizeNotificationCenterValue(failure.deliveryCategory)} • {labelizeNotificationCenterValue(failure.deliveryEventType || 'push_event')}
                  </p>
                  <p className="mt-2">{failure.error || 'Push receipt failed.'}</p>
                  <p className="mt-2 text-xs opacity-70">{formatNotificationCenterTimestamp(failure.checkedAt)}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

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
            {runAlerts.map((alert) => {
              const remediationSummary = getReviewRemediationSummary(alert);
              const reviewPath = buildReviewDetailPath(tenantType, alert);
              const inspectTarget = buildNotificationAlertInspectTarget(alert);
              const speechRuntimePath = buildNotificationSpeechRuntimePath(tenantType, alert.jobType);

              return (
              <div key={alert.id} className={`rounded-lg border p-3 ${getNotificationCenterAlertTone(alert.severity)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{alert.severity}</p>
                <p className="mt-1 text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm">{alert.message}</p>
                <p className="mt-2 text-xs opacity-80">
                  Job: {labelForNotificationCenterJobType(alert.jobType)} • {getNotificationCenterAlertIssueSummary(alert)}
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
                    Snoozed until {formatNotificationCenterTimestamp(alert.snoozedUntil)}
                  </p>
                ) : null}
                {alert.latestNote?.text ? (
                  <div className="mt-2 rounded-md border border-current/20 bg-white/50 p-2 text-xs">
                    <p className="font-medium">{alert.latestNote.author?.name || alert.latestNote.author?.email || 'Operator'}</p>
                    <p className="mt-1">{alert.latestNote.text}</p>
                  </div>
                ) : null}
                {remediationSummary ? (
                  <div className="mt-2 rounded-md border border-current/20 bg-white/50 p-2 text-xs">
                    <p className="font-medium">Remediation Context</p>
                    {remediationSummary.platform ? (
                      <p className="mt-1">Platform: {labelizeNotificationCenterValue(remediationSummary.platform)}</p>
                    ) : null}
                    {remediationSummary.reason ? (
                      <p className="mt-1">Reason: {formatNotificationCenterReasonLabel(remediationSummary.reason)}</p>
                    ) : null}
                    {remediationSummary.nextRetryAt ? (
                      <p className="mt-1">Next retry: {formatNotificationCenterTimestamp(remediationSummary.nextRetryAt)}</p>
                    ) : null}
                    {remediationSummary.message ? (
                      <p className="mt-1">Note: {remediationSummary.message}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                {reviewPath ? (
                  <button
                    type="button"
                    onClick={() => handleOpenReviewDetail(alert)}
                    className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                  >
                    Open Review
                  </button>
                ) : null}
                {inspectTarget ? (
                  <button
                    type="button"
                    onClick={() => handleInspectAlert(alert)}
                    className="mt-3 rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                  >
                    {inspectTarget.label}
                  </button>
                ) : null}
                  {alert.remediationPath ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAlertRemediation(alert)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                    >
                      Open remediation
                    </button>
                  ) : null}
                  {speechRuntimePath ? (
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
            );
            })}
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
                      {labelForNotificationCenterJobType(item.jobType)}: {item.count}
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
                {latestJobRuns.map((run) => {
                  const speechRuntimePath = buildNotificationSpeechRuntimePath(
                    tenantType,
                    run.jobType
                  );

                  return (
                  <div key={`${run.jobType}-${run.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{labelForNotificationCenterJobType(run.jobType)}</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationCenterStatusTone(run.status)}`}>
                        {run.status || 'unknown'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <p>Ran: {formatNotificationCenterTimestamp(run.createdAt)}</p>
                      <p>Triggered by: {run.triggeredBy || '—'}</p>
                      <p>Processed: {run.processed ?? run.resultCount ?? 0}</p>
                      <p>Candidates / recipients: {run.candidates ?? run.recipientCount ?? 0}</p>
                      {run.jobType === 'speech_provider_health' ? (
                        <>
                          <p>Reason: {formatNotificationCenterReasonLabel(run.reason)}</p>
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
                    {speechRuntimePath ? (
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceRuntime(run.jobType)}
                        className="mt-2 rounded-md border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-white"
                      >
                        Open Speech Runtime
                      </button>
                    ) : null}
                  </div>
                );
                })}
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
                      <td className="px-4 py-3 text-gray-600">{formatNotificationCenterTimestamp(run.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-900">{labelForNotificationCenterJobType(run.jobType)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationCenterStatusTone(run.status)}`}>
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
                {labelForNotificationCenterJobType(selectedJobRunDetail.run?.jobType)} from {formatNotificationCenterTimestamp(selectedJobRunDetail.run?.createdAt)}
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
            {selectedJobRunIsSpeechHealth &&
            buildNotificationSpeechRuntimePath(tenantType, selectedJobRun?.jobType) ? (
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
                    <p>Reason: {formatNotificationCenterReasonLabel(selectedJobRun?.reason)}</p>
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
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationCenterSpeechProviderTone(provider)}`}>
                            {provider.ok === false ? 'unhealthy' : provider.ok === true ? 'healthy' : 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {provider.selected ? 'Selected' : provider.gatingRelevant ? 'Gating only' : 'Fallback'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{provider.source || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatNotificationCenterTimestamp(provider.checkedAt)}</td>
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
                      <td className="px-4 py-3 text-gray-600">{formatNotificationCenterTimestamp(event.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationCenterStatusTone(event.status)}`}>
                          {event.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{String(event.eventType || '—').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-600 uppercase">{event.channel || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{event.to || event.toUserId || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{event.retryOfEventId || '—'}</td>
                      <td className="px-4 py-3">
                        {isRetryableNotificationCenterEvent(event) ? (
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

          {selectedEventActions.hasAnyAction ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedEventActions.reviewPath ? (
                <button
                  type="button"
                  onClick={() => handleOpenReviewDetail(selectedEventDetail)}
                  className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-medium text-fuchsia-700 hover:bg-fuchsia-100"
                >
                  Open Review Detail
                </button>
              ) : null}
              {selectedEventActions.feedbackRecoveryPath ? (
                <button
                  type="button"
                  onClick={() => handleOpenFeedbackRecovery(selectedEventDetail)}
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  Open Recovery Detail
                </button>
              ) : null}
              {selectedEventActions.feedbackIntegrationsPath ? (
                <button
                  type="button"
                  onClick={() => handleOpenFeedbackIntegrations(selectedEventDetail)}
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                >
                  Open Integrations
                </button>
              ) : null}
            </div>
          ) : null}
          {selectedEventActions.remediationSummary ? (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              <p className="text-xs font-semibold uppercase tracking-wide">Review Remediation Context</p>
              {selectedEventActions.remediationSummary.platform ? (
                <p className="mt-2">Platform: {labelizeNotificationCenterValue(selectedEventActions.remediationSummary.platform)}</p>
              ) : null}
              {selectedEventActions.remediationSummary.reason ? (
                <p className="mt-1">Reason: {formatNotificationCenterReasonLabel(selectedEventActions.remediationSummary.reason)}</p>
              ) : null}
              {selectedEventActions.remediationSummary.nextRetryAt ? (
                <p className="mt-1">Next retry: {formatNotificationCenterTimestamp(selectedEventActions.remediationSummary.nextRetryAt)}</p>
              ) : null}
              {selectedEventActions.remediationSummary.message ? (
                <p className="mt-2">{selectedEventActions.remediationSummary.message}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Structured Source</p>
              {selectedEventDetail.interactionEvent ? (
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p>Interaction event: {selectedEventDetail.interactionEvent.id}</p>
                  <p>Channel: {String(selectedEventDetail.interactionEvent.channel || '—').toUpperCase()}</p>
                  <p>Review status: {formatNotificationCenterReasonLabel(selectedEventDetail.interactionEvent.reviewStatus)}</p>
                  <p>Customer: {selectedEventDetail.interactionEvent.customer?.name || selectedEventDetail.interactionEvent.customer?.phone || '—'}</p>
                  {selectedEventDetail.rootEvent?.reviewId ? (
                    <p>Review ID: {selectedEventDetail.rootEvent.reviewId}</p>
                  ) : null}
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
                  {selectedEventActions.hasAnyAction ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedEventActions.reviewPath ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewDetail(selectedEventDetail)}
                          className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-medium text-fuchsia-700 hover:bg-fuchsia-100"
                        >
                          Open Review Detail
                        </button>
                      ) : null}
                      {selectedEventActions.feedbackRecoveryPath ? (
                        <button
                          type="button"
                          onClick={() => handleOpenFeedbackRecovery(selectedEventDetail)}
                          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          Open Recovery Detail
                        </button>
                      ) : null}
                      {selectedEventActions.feedbackIntegrationsPath ? (
                        <button
                          type="button"
                          onClick={() => handleOpenFeedbackIntegrations(selectedEventDetail)}
                          className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                        >
                          Open Integrations
                        </button>
                      ) : null}
                    </div>
                  ) : null}
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
                      {selectedEventSourceSurfaceTarget ? (
                        <button
                          type="button"
                          onClick={() => handleOpenSourceSurface(selectedEventDetail.interactionEvent)}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          {selectedEventSourceSurfaceTarget.label}
                        </button>
                      ) : null}
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
                      {selectedEventSourceSurfaceTarget ? (
                        <button
                          type="button"
                          onClick={() => handleOpenSourceSurface(selectedEventDetail.interactionEvent)}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          {selectedEventSourceSurfaceTarget.label}
                        </button>
                      ) : null}
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
                      <td className="px-4 py-3 text-gray-600">{formatNotificationCenterTimestamp(event.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-600">{event.retryAttempt || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationCenterStatusTone(event.latestRetryStatus || event.status)}`}>
                          {event.latestRetryStatus || event.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 uppercase">{event.channel || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{event.to || event.toUserId || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{event.retryOfEventId || '—'}</td>
                      <td className="px-4 py-3">
                        {isRetryableNotificationCenterEvent(event) ? (
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
              Delivery failures, review alerts, and queued events need operator attention. Sent and delivered events are logged for audit history.
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
                {visibleEvents.map((event) => {
                  const eventActions = buildNotificationEventActionModel(tenantType, event);

                  return (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-gray-600">{formatNotificationCenterTimestamp(event.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationCenterStatusTone(event.status)}`}>
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
                        {eventActions.canOpenReview ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReviewDetail(event)}
                            className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-medium text-fuchsia-700 hover:bg-fuchsia-100"
                          >
                            Open Review
                          </button>
                        ) : null}
                        {eventActions.canOpenRecovery ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedbackRecovery(event)}
                            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          >
                            Open Recovery
                          </button>
                        ) : null}
                        {eventActions.canOpenIntegrations ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedbackIntegrations(event)}
                            className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            {eventActions.integrationsLabel}
                          </button>
                        ) : null}
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
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
