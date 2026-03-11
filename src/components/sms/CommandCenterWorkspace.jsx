import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchSlackCommandCenterEvents,
  triggerSlackCommandCenterDemo,
} from '../../api/sms';
import { getNativeObjectRoute, getPortalBasePath } from '../../utils/objectRouting';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Live AI Command Center',
      subtitle: 'Track live Slack activity for calls, reservations, orders, and workflow changes from your restaurant AI flows.',
      settingsRoute: '/restaurant/settings',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'Live AI Command Center',
      subtitle: 'Track lead capture, showing activity, property workflow changes, and Slack feed delivery for your real estate AI flows.',
      settingsRoute: '/estate/settings',
    };
  }
  return {
    title: 'Live AI Command Center',
    subtitle: 'Track call capture, work-item updates, and Slack feed delivery for your office AI flows.',
    settingsRoute: '/voice/settings',
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

function formatLabel(value) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('failed') || normalized.includes('error')) {
    return 'bg-red-100 text-red-700';
  }
  if (normalized.includes('duplicate') || normalized.includes('rate') || normalized.includes('disabled') || normalized.includes('skipped')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === 'sent') {
    return 'bg-green-100 text-green-700';
  }
  return 'bg-slate-100 text-slate-700';
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
  const copy = copyForTenant(tenantType);
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingDemo, setSendingDemo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await fetchSlackCommandCenterEvents({
          limit: 100,
          days,
          status: status || undefined,
          eventType: eventType || undefined,
        });
        if (!cancelled) {
          setEvents(data.events || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.error || 'Failed to load Command Center history.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days, eventType, status]);

  async function handleSendDemo() {
    try {
      setSendingDemo(true);
      setError('');
      setSuccess('');
      await triggerSlackCommandCenterDemo();
      const data = await fetchSlackCommandCenterEvents({ limit: 100, days, status: status || undefined, eventType: eventType || undefined });
      setEvents(data.events || []);
      setSuccess('Command Center demo events sent.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send Command Center demo.');
    } finally {
      setSendingDemo(false);
    }
  }

  const summary = useMemo(() => {
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
      .slice(0, 4);

    return {
      total: events.length,
      sent,
      skipped,
      channels: channels.size,
      topEvents,
    };
  }, [events]);

  function getCommandCenterTargets(item) {
    const portalBasePath = getPortalBasePath(tenantType);
    const payload = item.payload || {};
    const graphRefs = payload.graphRefs || item.graphRefs || {};
    const nativeObjectRoute = getNativeObjectRoute(tenantType, graphRefs);
    const targets = [];

    if (nativeObjectRoute?.path) {
      targets.push({ key: 'record', label: nativeObjectRoute.label, path: nativeObjectRoute.path });
    }

    const interactionEventId = payload.interactionEventId || item.interactionEventId || item.sourceRefId;
    if (interactionEventId && payload.sourceType !== 'call_session') {
      targets.push({
        key: 'intelligence',
        label: 'Open Intelligence',
        path: `${portalBasePath}/intelligence?eventId=${encodeURIComponent(interactionEventId)}`,
      });
      targets.push({
        key: 'notifications',
        label: 'Open Notifications',
        path: `${portalBasePath}/notifications?interactionEventId=${encodeURIComponent(interactionEventId)}`,
      });
    }

    if (payload.sourceType === 'call_session' || item.sourceType === 'call_session' || payload.callSid || item.callSid) {
      const callId = payload.sourceRefId || item.sourceRefId || payload.callSid || item.callSid;
      if (callId) {
        targets.push({
          key: 'source',
          label: 'Open Calls',
          path: `${portalBasePath}/calls?callId=${encodeURIComponent(callId)}`,
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
          path: `${portalBasePath}/sms?${searchParams.toString()}`,
        });
      }
    }

    return targets.filter((target, index, list) => list.findIndex((itemTarget) => itemTarget.path === target.path) === index);
  }

  return (
    <section className="space-y-6">
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{copy.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSendDemo}
              className="btn-primary"
              disabled={sendingDemo}
            >
              {sendingDemo ? 'Sending Demo…' : 'Send Demo Event'}
            </button>
            <Link to={`${copy.settingsRoute}?tab=sms`} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Open SMS Settings
            </Link>
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

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Events</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{summary.total}</p>
            <p className="mt-1 text-sm text-gray-500">Filtered feed rows</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sent</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">{summary.sent}</p>
            <p className="mt-1 text-sm text-gray-500">Delivered to Slack webhook</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Skipped</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{summary.skipped}</p>
            <p className="mt-1 text-sm text-gray-500">Disabled, duplicate, or rate-limited</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Channels</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{summary.channels}</p>
            <p className="mt-1 text-sm text-gray-500">Distinct Slack channels used</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Window</span>
            <select className="input-field" value={days} onChange={(event) => setDays(Number(event.target.value || 7))}>
              <option value={1}>24h</option>
              <option value={7}>7d</option>
              <option value={30}>30d</option>
              <option value={90}>90d</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Status</span>
            <select className="input-field" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Event Type</span>
            <select className="input-field" value={eventType} onChange={(event) => setEventType(event.target.value)}>
              {EVENT_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_2fr]">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Top Feed Activity</h3>
          <p className="mt-1 text-sm text-gray-500">Most frequent Command Center event types in the current window.</p>
          <div className="mt-4 space-y-3">
            {summary.topEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No activity in the current filter.</p>
            ) : (
              summary.topEvents.map(([key, count]) => (
                <div key={key} className="rounded-lg border border-gray-200 p-3">
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
          <h3 className="text-lg font-semibold text-gray-900">Recent Command Center History</h3>
          <p className="mt-1 text-sm text-gray-500">Live Slack feed attempts, including successful sends and suppressed events.</p>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading Command Center history…</p>
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
                  {events.map((item) => (
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
                          {getCommandCenterTargets(item).length === 0 ? (
                            <span className="text-xs text-gray-400">No linked target</span>
                          ) : (
                            getCommandCenterTargets(item).slice(0, 3).map((target) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
