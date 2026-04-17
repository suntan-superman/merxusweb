import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchSlackCommandCenterEvents,
  fetchSmsAnalytics,
  fetchSmsDailyDigest,
  fetchSmsNotificationEvents,
  fetchSmsNotificationRunAlertAnalytics,
  fetchSmsNotificationRunAlerts,
  triggerSlackCommandCenterDemo,
} from '../../api/sms';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { getNativeObjectRoute, getPortalBasePath } from '../../utils/objectRouting';
import SelectField from '../common/SelectField';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Merxus Command Center',
      subtitle: 'Run reservations, orders, missed-call recovery, and staff notifications from one live operations surface.',
      settingsRoute: '/restaurant/settings?tab=sms',
      callsRoute: '/restaurant/calls',
      inboxRoute: '/restaurant/sms',
      notificationsRoute: '/restaurant/notifications',
      intelligenceRoute: '/restaurant/intelligence',
      workLabel: 'Reservations and orders',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      title: 'Merxus Command Center',
      subtitle: 'Monitor lead capture, showing activity, callback follow-up, and notification health from one command surface.',
      settingsRoute: '/estate/settings?tab=sms',
      callsRoute: '/estate/calls',
      inboxRoute: '/estate/sms',
      notificationsRoute: '/estate/notifications',
      intelligenceRoute: '/estate/intelligence',
      workLabel: 'Showings and listings',
    };
  }

  return {
    title: 'Merxus Command Center',
    subtitle: 'Coordinate calls, message follow-up, work items, and automation health from one live operations hub.',
    settingsRoute: '/voice/settings?tab=sms',
    callsRoute: '/voice/calls',
    inboxRoute: '/voice/sms',
    notificationsRoute: '/voice/notifications',
    intelligenceRoute: '/voice/intelligence',
    workLabel: 'Appointments and work items',
  };
}

function formatDate(value) {
  if (!value) return 'Pending timestamp';

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

  return 'Pending timestamp';
}

function toDateValue(value) {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  const seconds = value?._seconds ?? value?.seconds ?? null;
  if (seconds) {
    return new Date(seconds * 1000);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function formatLabel(value) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds || 0);
  if (!seconds) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('failed') || normalized.includes('error') || normalized === 'undelivered') {
    return 'bg-red-100 text-red-700';
  }
  if (normalized.includes('duplicate') || normalized.includes('rate') || normalized.includes('disabled') || normalized.includes('skipped') || normalized === 'queued' || normalized === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === 'sent' || normalized === 'delivered' || normalized === 'completed') {
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

function resolveTenantScope(tenantType, auth) {
  if (tenantType === 'restaurant' && auth.restaurantId) {
    return { field: 'restaurantId', id: auth.restaurantId };
  }
  if (tenantType === 'real_estate' && auth.agentId) {
    return { field: 'agentId', id: auth.agentId };
  }
  if (tenantType === 'voice' && auth.officeId) {
    return { field: 'officeId', id: auth.officeId };
  }
  return null;
}

function getCallDate(call) {
  return toDateValue(call?.endedAt || call?.startedAt || call?.createdAt);
}

function buildSpeechRuntimePath(tenantType, jobType) {
  if (jobType !== 'speech_provider_health') {
    return null;
  }

  if (tenantType === 'restaurant') {
    return '/restaurant/settings?tab=ai&panel=speech-runtime';
  }
  if (tenantType === 'real_estate') {
    return '/estate/settings?tab=ai&panel=speech-runtime';
  }
  if (tenantType === 'voice') {
    return '/voice/settings?tab=ai&panel=speech-runtime';
  }
  return null;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'rate_limited', label: 'Rate limited' },
  { value: 'disabled', label: 'Disabled' },
];

const EVENT_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'incoming_call_detected', label: 'Incoming call detected' },
  { value: 'intent_classified', label: 'Intent classified' },
  { value: 'event_created', label: 'Structured event created' },
  { value: 'reservation_created', label: 'Reservation captured' },
  { value: 'order_created', label: 'Order captured' },
  { value: 'buyer_lead_created', label: 'Buyer lead captured' },
  { value: 'seller_lead_created', label: 'Seller lead captured' },
  { value: 'support_request_created', label: 'Support request captured' },
  { value: 'quote_request_created', label: 'Quote request captured' },
  { value: 'appointment_requested', label: 'Appointment requested' },
  { value: 'workflow_status_changed', label: 'Workflow status changed' },
  { value: 'assignment_changed', label: 'Assignment changed' },
  { value: 'appointment_updated', label: 'Appointment updated' },
  { value: 'quote_updated', label: 'Quote updated' },
  { value: 'service_request_updated', label: 'Service request updated' },
];

export default function CommandCenterWorkspace({ tenantType }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const copy = copyForTenant(tenantType);
  const tenantScope = useMemo(
    () => resolveTenantScope(tenantType, auth),
    [tenantType, auth.restaurantId, auth.officeId, auth.agentId]
  );
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [events, setEvents] = useState([]);
  const [notificationEvents, setNotificationEvents] = useState([]);
  const [runAlerts, setRunAlerts] = useState([]);
  const [runAlertAnalytics, setRunAlertAnalytics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [digestSummary, setDigestSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingDemo, setSendingDemo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: calls = [], loading: callsLoading } = useFirestoreCollection(
    tenantScope?.id ? 'callSessions' : null,
    tenantScope?.id
      ? {
          where: [{ field: tenantScope.field, operator: '==', value: tenantScope.id }],
          orderBy: [{ field: 'endedAt', direction: 'desc' }],
          limit: 250,
        }
      : {}
  );

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const [
          commandCenterData,
          notificationEventsData,
          runAlertsData,
          runAlertAnalyticsData,
          analyticsData,
          digestData,
        ] = await Promise.all([
          fetchSlackCommandCenterEvents({
            limit: 100,
            days,
            status: status || undefined,
            eventType: eventType || undefined,
          }),
          fetchSmsNotificationEvents({ limit: 50, days }),
          fetchSmsNotificationRunAlerts({ limit: 8, days, status: 'active' }),
          fetchSmsNotificationRunAlertAnalytics(days, 200),
          fetchSmsAnalytics(days),
          fetchSmsDailyDigest(1),
        ]);

        setEvents(commandCenterData.events || []);
        setNotificationEvents(notificationEventsData.events || []);
        setRunAlerts(runAlertsData.alerts || []);
        setRunAlertAnalytics(runAlertAnalyticsData.analytics || null);
        setAnalytics(analyticsData.analytics || null);
        setDigestSummary(digestData.summary || null);
      } catch (loadError) {
        setError(loadError?.response?.data?.error || 'Failed to load Command Center activity.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, eventType, status]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSendDemo() {
    try {
      setSendingDemo(true);
      setError('');
      setSuccess('');
      await triggerSlackCommandCenterDemo();
      await loadData({ silent: true });
      setSuccess('Command Center demo events sent.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send Command Center demo.');
    } finally {
      setSendingDemo(false);
    }
  }

  const commandSummary = useMemo(() => {
    const sent = events.filter((item) => String(item.status || '').toLowerCase() === 'sent').length;
    const skipped = events.filter((item) => String(item.status || '').toLowerCase() !== 'sent').length;
    const channels = new Set(events.map((item) => item.slackChannel).filter(Boolean));
    const eventCounts = new Map();

    for (const item of events) {
      const key = item.eventType || 'unknown';
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
    }

    const topEvents = Array.from(eventCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);

    return {
      total: events.length,
      sent,
      skipped,
      channels: channels.size,
      topEvents,
    };
  }, [events]);

  const notificationSummary = useMemo(() => {
    const failed = notificationEvents.filter((item) =>
      ['failed', 'undelivered', 'error'].includes(String(item.status || '').toLowerCase())
    ).length;
    const queued = notificationEvents.filter((item) =>
      ['queued', 'pending'].includes(String(item.status || '').toLowerCase())
    ).length;

    return {
      total: notificationEvents.length,
      failed,
      queued,
      attentionNeeded: failed + queued,
    };
  }, [notificationEvents]);

  const callSummary = useMemo(() => {
    const since = new Date(Date.now() - Math.max(1, Number(days || 7)) * 24 * 60 * 60 * 1000);
    const recentCalls = calls.filter((call) => {
      const callDate = getCallDate(call);
      return callDate && callDate >= since;
    });

    const activeCalls = recentCalls.filter((call) =>
      ['ringing', 'in_progress', 'in-progress', 'active'].includes(String(call.status || '').toLowerCase())
    ).length;

    const missedCalls = recentCalls.filter((call) =>
      ['missed', 'no-answer', 'no_answer'].includes(String(call.status || '').toLowerCase())
    ).length;

    const completedCalls = recentCalls.filter((call) =>
      ['completed', 'answered'].includes(String(call.status || '').toLowerCase())
    ).length;

    const totalDurationSeconds = recentCalls.reduce(
      (sum, call) => sum + Number(call.durationSec || call.duration || 0),
      0
    );

    return {
      total: recentCalls.length,
      activeCalls,
      missedCalls,
      completedCalls,
      averageDuration: recentCalls.length ? Math.round(totalDurationSeconds / recentCalls.length) : 0,
      latestCalls: recentCalls.slice(0, 5),
    };
  }, [calls, days]);

  const kpis = useMemo(
    () => [
      {
        label: 'Active calls',
        value: callSummary.activeCalls,
        helper: `${callSummary.total} calls in ${days}d`,
      },
      {
        label: 'Open alerts',
        value: runAlerts.length,
        helper: `${runAlerts.filter((alert) => alert.severity === 'critical').length} critical`,
      },
      {
        label: 'Awaiting reply',
        value: notificationSummary.attentionNeeded,
        helper: `${notificationSummary.failed} failed, ${notificationSummary.queued} queued`,
      },
      {
        label: 'SMS delivery rate',
        value: `${analytics?.deliveryRate || 0}%`,
        helper: `${analytics?.totals?.outbound || 0} outbound`,
      },
      {
        label: 'Command feed events',
        value: commandSummary.total,
        helper: `${commandSummary.sent} sent to Slack`,
      },
      {
        label: 'Missed callbacks',
        value: callSummary.missedCalls,
        helper: `${formatDuration(callSummary.averageDuration)} avg call`,
      },
    ],
    [analytics, callSummary, commandSummary, days, notificationSummary, runAlerts]
  );

  const liveFeedItems = useMemo(() => {
    const commandFeed = events.slice(0, 6).map((item) => {
      const targets = getCommandCenterTargets(item, tenantType);
      return {
        id: `command-${item.id}`,
        occurredAt: toDateValue(item.createdAt),
        title: formatLabel(item.eventType),
        subtitle: item.summary || item.subject || item.reason || 'Command Center update',
        meta: [item.customerName || item.callerPhone || 'No customer', item.slackChannel || 'Default Slack channel']
          .filter(Boolean)
          .join(' • '),
        tone: statusTone(item.status),
        badge: formatLabel(item.status),
        actionLabel: 'Open linked view',
        actionPath: targets[0]?.path || null,
      };
    });

    const notificationFeed = notificationEvents.slice(0, 4).map((item) => ({
      id: `notification-${item.id}`,
      occurredAt: toDateValue(item.createdAt),
      title: `${formatLabel(item.eventType)} notification`,
      subtitle: `${String(item.channel || 'unknown').toUpperCase()} to ${item.to || item.toUserId || 'destination'}`,
      meta: [formatLabel(item.status), item.recipientRole || 'operator']
        .filter(Boolean)
        .join(' • '),
      tone: statusTone(item.status),
      badge: formatLabel(item.status),
      actionLabel: 'Inspect notification',
      actionPath: `${copy.notificationsRoute}?eventId=${encodeURIComponent(item.id)}`,
    }));

    const alertFeed = runAlerts.slice(0, 3).map((alert) => ({
      id: `alert-${alert.id}`,
      occurredAt: toDateValue(alert.updatedAt || alert.createdAt || alert.lastObservedAt),
      title: alert.title || `${labelForJobType(alert.jobType)} alert`,
      subtitle: alert.message || 'Automation issue requires review.',
      meta: [labelForJobType(alert.jobType), `Failures: ${alert.consecutiveFailures || 0}`]
        .filter(Boolean)
        .join(' • '),
      tone:
        alert.severity === 'critical'
          ? 'bg-red-100 text-red-700'
          : alert.severity === 'warning'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-blue-100 text-blue-700',
      badge: alert.severity || 'info',
      actionLabel: 'Open alert queue',
      actionPath: copy.notificationsRoute,
    }));

    const callFeed = callSummary.latestCalls.map((call) => ({
      id: `call-${call.id}`,
      occurredAt: getCallDate(call),
      title:
        String(call.status || '').toLowerCase() === 'missed'
          ? 'Missed call'
          : `${formatLabel(call.status || 'call')} call`,
      subtitle: call.transcriptSummary || call.summary || 'Recent call activity',
      meta: [call.customerName || call.from || 'Unknown caller', formatDuration(call.durationSec || call.duration || 0)]
        .filter(Boolean)
        .join(' • '),
      tone: statusTone(call.status === 'missed' ? 'failed' : 'completed'),
      badge: formatLabel(call.status || 'call'),
      actionLabel: 'Open calls',
      actionPath: copy.callsRoute,
    }));

    return [...alertFeed, ...notificationFeed, ...commandFeed, ...callFeed]
      .filter((item) => item.occurredAt)
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 12);
  }, [callSummary.latestCalls, copy.callsRoute, copy.notificationsRoute, events, notificationEvents, runAlerts, tenantType]);

  const watchlistItems = useMemo(() => {
    const digestHighlights = (digestSummary?.highlights || []).slice(0, 2).map((highlight) => ({
      id: `highlight-${highlight.id}`,
      label: formatLabel(highlight.eventType),
      value: highlight.objectSummary || highlight.summary || highlight.callerName || 'No summary available',
    }));

    const analyticsAlerts = (analytics?.alerts || []).slice(0, 2).map((alert, index) => ({
      id: `analytics-${index}`,
      label: `${String(alert.severity || 'info').toUpperCase()} alert`,
      value: `${alert.title}: ${alert.message}`,
    }));

    const backlogItems = runAlertAnalytics
      ? [
          {
            id: 'unowned-age',
            label: 'Oldest unowned alert',
            value: `${runAlertAnalytics.unownedAges?.oldestHours || 0}h open`,
          },
          {
            id: 'top-job-type',
            label: 'Top alert source',
            value: runAlertAnalytics.jobTypeCounts?.[0]
              ? `${labelForJobType(runAlertAnalytics.jobTypeCounts[0].jobType)} (${runAlertAnalytics.jobTypeCounts[0].count})`
              : 'No active alert source',
          },
        ]
      : [];

    return [...analyticsAlerts, ...backlogItems, ...digestHighlights].slice(0, 5);
  }, [analytics?.alerts, digestSummary?.highlights, runAlertAnalytics]);

  function getCommandCenterTargets(item, scopedTenantType) {
    const scopedPortalBasePath = getPortalBasePath(scopedTenantType);
    const payload = item.payload || {};
    const graphRefs = payload.graphRefs || item.graphRefs || {};
    const nativeObjectRoute = getNativeObjectRoute(scopedTenantType, graphRefs);
    const targets = [];

    if (nativeObjectRoute?.path) {
      targets.push({ key: 'record', label: nativeObjectRoute.label, path: nativeObjectRoute.path });
    }

    const interactionEventId = payload.interactionEventId || item.interactionEventId || item.sourceRefId;
    if (interactionEventId && payload.sourceType !== 'call_session') {
      targets.push({
        key: 'intelligence',
        label: 'Open Intelligence',
        path: `${scopedPortalBasePath}/intelligence?eventId=${encodeURIComponent(interactionEventId)}`,
      });
      targets.push({
        key: 'notifications',
        label: 'Open Notifications',
        path: `${scopedPortalBasePath}/notifications?interactionEventId=${encodeURIComponent(interactionEventId)}`,
      });
    }

    if (payload.sourceType === 'call_session' || item.sourceType === 'call_session' || payload.callSid || item.callSid) {
      const callId = payload.sourceRefId || item.sourceRefId || payload.callSid || item.callSid;
      if (callId) {
        targets.push({
          key: 'source',
          label: 'Open Calls',
          path: `${scopedPortalBasePath}/calls?callId=${encodeURIComponent(callId)}`,
        });
      }
    }

    if (payload.sourceType === 'sms_message' || item.sourceType === 'sms_message' || payload.messageSid || item.messageSid) {
      const contactPhone = payload.callerPhone || item.callerPhone || payload.phone || '';
      if (contactPhone) {
        const searchParams = new URLSearchParams();
        searchParams.set('contactPhone', contactPhone);
        const messageSid = payload.messageSid || item.messageSid || payload.sourceRefId || item.sourceRefId;
        if (messageSid) {
          searchParams.set('messageSid', messageSid);
        }
        targets.push({
          key: 'sms',
          label: 'Open SMS Inbox',
          path: `${scopedPortalBasePath}/sms?${searchParams.toString()}`,
        });
      }
    }

    return targets.filter(
      (target, index, list) => list.findIndex((candidate) => candidate.path === target.path) === index
    );
  }

  return (
    <section className="space-y-6">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">Operations Hub</p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{copy.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={copy.callsRoute}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Calls
              </Link>
              <Link
                to={copy.inboxRoute}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Inbox
              </Link>
              <Link
                to={copy.notificationsRoute}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Alerts
              </Link>
              <Link
                to={copy.intelligenceRoute}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Intelligence
              </Link>
              <Link
                to={copy.settingsRoute}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Settings
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={handleSendDemo}
              className="btn-primary"
              disabled={sendingDemo}
            >
              {sendingDemo ? 'Sending demo...' : 'Send Demo Event'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            {success}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {kpis.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
              <p className="mt-2 text-xs text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Operations Feed</h3>
              <p className="mt-1 text-sm text-gray-500">
                Calls, automation alerts, Slack dispatches, and customer notification activity are merged here.
              </p>
            </div>
            <Link to={copy.intelligenceRoute} className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Open intelligence
            </Link>
          </div>

          {loading && !liveFeedItems.length && !calls.length ? (
            <p className="mt-4 text-sm text-gray-500">Loading live operations feed...</p>
          ) : liveFeedItems.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No recent operational events in the current window.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {liveFeedItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.tone}`}>
                          {item.badge}
                        </span>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {formatDate(item.occurredAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.subtitle}</p>
                      <p className="mt-2 text-xs text-gray-500">{item.meta}</p>
                    </div>
                    <div className="flex shrink-0">
                      {item.actionPath ? (
                        <button
                          type="button"
                          onClick={() => navigate(item.actionPath)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {item.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Action Queue</h3>
              <p className="mt-1 text-sm text-gray-500">
                Priority items that need assignment, triage, or a manager decision.
              </p>
            </div>
            <Link to={copy.notificationsRoute} className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Open queue
            </Link>
          </div>

          {runAlerts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">No active automation alerts</p>
              <p className="mt-1 text-sm text-slate-500">
                The queue is clear. New alert ownership and escalation items will surface here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {runAlerts.map((alert) => (
                <div key={alert.id} className={`rounded-2xl border p-4 ${getAlertTone(alert.severity)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide">{alert.severity || 'info'}</p>
                    <p className="text-xs opacity-80">{formatDate(alert.updatedAt || alert.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{alert.title}</p>
                  <p className="mt-1 text-sm">{alert.message}</p>
                  <div className="mt-3 space-y-1 text-xs opacity-80">
                    <p>Job: {labelForJobType(alert.jobType)}</p>
                    <p>Consecutive failures: {alert.consecutiveFailures || 0}</p>
                    <p>Owner: {alert.owner?.name || alert.owner?.email || 'Unowned'}</p>
                    {alert.isSnoozed ? <p>Snoozed until {formatDate(alert.snoozedUntil)}</p> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(copy.notificationsRoute)}
                      className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                    >
                      Open alert queue
                    </button>
                    {buildSpeechRuntimePath(tenantType, alert.jobType) ? (
                      <button
                        type="button"
                        onClick={() => navigate(buildSpeechRuntimePath(tenantType, alert.jobType))}
                        className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      >
                        Open speech runtime
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {runAlertAnalytics ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue Health</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Owned</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{runAlertAnalytics.totals?.owned || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Unowned</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{runAlertAnalytics.totals?.unowned || 0}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p>Average unowned age: {runAlertAnalytics.unownedAges?.averageHours || 0}h</p>
                <p>Oldest unowned alert: {runAlertAnalytics.unownedAges?.oldestHours || 0}h</p>
                <p>
                  Top owner:{' '}
                  {runAlertAnalytics.ownerCounts?.[0]
                    ? `${runAlertAnalytics.ownerCounts[0].owner} (${runAlertAnalytics.ownerCounts[0].count})`
                    : 'No claimed alerts'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Top Feed Activity</h3>
          <p className="mt-1 text-sm text-gray-500">Most frequent command-feed event types in the current window.</p>
          <div className="mt-4 space-y-3">
            {commandSummary.topEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No feed activity in the current filter.</p>
            ) : (
              commandSummary.topEvents.map(([key, count]) => (
                <div key={key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 capitalize">{formatLabel(key)}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Channel Performance</h3>
          <p className="mt-1 text-sm text-gray-500">Quick operating read across calls, messaging, and downstream delivery.</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Calls</p>
                <span className="text-sm font-semibold text-gray-900">{callSummary.total}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {callSummary.completedCalls} completed, {callSummary.missedCalls} missed, {formatDuration(callSummary.averageDuration)} average duration
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">SMS</p>
                <span className="text-sm font-semibold text-gray-900">{analytics?.totals?.messages || 0}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {analytics?.totals?.outbound || 0} outbound, {analytics?.totals?.inbound || 0} inbound, {analytics?.totals?.optOuts || 0} opt-outs
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Notifications</p>
                <span className="text-sm font-semibold text-gray-900">{notificationSummary.total}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {notificationSummary.failed} failed, {notificationSummary.queued} queued, {digestSummary?.totals?.notifications || 0} in today&apos;s digest
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Workflow surface</p>
                <span className="text-sm font-semibold text-gray-900">{copy.workLabel}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Command Center actions route operators into the existing domain-specific work views for this tenant.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Trends and Watchlist</h3>
          <p className="mt-1 text-sm text-gray-500">High-signal issues and highlights surfaced from SMS analytics and daily digest data.</p>
          <div className="mt-4 space-y-3">
            {watchlistItems.length === 0 ? (
              <p className="text-sm text-gray-500">No watchlist items available yet.</p>
            ) : (
              watchlistItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                  <p className="mt-2 text-sm text-gray-800">{item.value}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Window"
            value={days}
            onChange={(nextValue) => setDays(Number(nextValue || 7))}
            options={[
              { value: 1, label: '24h' },
              { value: 7, label: '7d' },
              { value: 30, label: '30d' },
              { value: 90, label: '90d' },
            ]}
          />
          <SelectField
            label="Slack Status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.filter((option) => option.value !== '').map((option) => ({ value: option.value, label: option.label }))}
            placeholder="All statuses"
          />
          <SelectField
            label="Slack Event Type"
            value={eventType}
            onChange={setEventType}
            options={EVENT_OPTIONS.filter((option) => option.value !== '').map((option) => ({ value: option.value, label: option.label }))}
            placeholder="All events"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Command Center History</h3>
            <p className="mt-1 text-sm text-gray-500">
              Slack feed attempts remain available as the audit trail beneath the broader operational dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{commandSummary.channels} active Slack channels</span>
            <span>{callsLoading ? 'Loading calls...' : `${callSummary.total} scoped calls`}</span>
          </div>
        </div>

        {loading && events.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Loading Command Center history...</p>
        ) : events.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No Command Center events match the current filters.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Event</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Channel</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Customer</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Summary</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {events.map((item) => {
                  const targets = getCommandCenterTargets(item, tenantType);
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-600">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-2 text-gray-900 capitalize">{formatLabel(item.eventType)}</td>
                      <td className="px-3 py-2 text-gray-600">{item.slackChannel || 'Default'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                          {formatLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.customerName || item.callerPhone || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{item.summary || item.subject || item.reason || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {targets.length === 0 ? (
                            <span className="text-xs text-gray-400">No linked target</span>
                          ) : (
                            targets.slice(0, 3).map((target) => (
                              <button
                                key={`${item.id}-${target.key}`}
                                type="button"
                                onClick={() => navigate(target.path)}
                                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                {target.label}
                              </button>
                            ))
                          )}
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
