import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchSmsAnalytics,
  fetchSmsConversations,
  fetchSmsDailyDigest,
  fetchSmsMessages,
  fetchSmsNotificationEvents,
  fetchSmsOptOuts,
  sendManualSms,
  sendSmsDailyDigest,
} from '../../api/sms';
import SmsAnalyticsPanel from './SmsAnalyticsPanel';

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

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

function getStatusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'delivered') return 'bg-green-100 text-green-700';
  if (normalized === 'failed' || normalized === 'undelivered') return 'bg-red-100 text-red-700';
  if (normalized === 'sent' || normalized === 'queued') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function getNotificationTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'sent' || normalized === 'delivered' || normalized === 'queued') return 'bg-green-100 text-green-700';
  if (normalized === 'failed' || normalized === 'error' || normalized === 'undelivered') return 'bg-red-100 text-red-700';
  return 'bg-blue-100 text-blue-700';
}

function getInboxCopy(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'SMS Inbox',
      subtitle: 'Review menu follow-ups, inbound texts, opt-outs, and manual replies from one place.',
      notificationsRoute: '/restaurant/notifications',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'SMS Inbox',
      subtitle: 'Track listing inquiries, callback texts, and suppression state for your real estate line.',
      notificationsRoute: '/estate/notifications',
    };
  }
  return {
    title: 'SMS Inbox',
    subtitle: 'Manage service texts, payment follow-ups, inbound conversations, and opt-outs.',
    notificationsRoute: '/voice/notifications',
  };
}

function getActivityLimit(days) {
  if (days >= 90) return 500;
  if (days >= 30) return 250;
  return 100;
}

export default function SmsInboxWorkspace({ tenantType, showHeader = true }) {
  const copy = getInboxCopy(tenantType);
  const [searchParams] = useSearchParams();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingManual, setSendingManual] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedConversationPhone, setSelectedConversationPhone] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [digestSummary, setDigestSummary] = useState(null);
  const [manualSendForm, setManualSendForm] = useState({ to: '', body: '' });
  const [activity, setActivity] = useState({
    conversations: [],
    messages: [],
    optOuts: [],
    notificationEvents: [],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingDigest, setSendingDigest] = useState(false);
  const requestedConversationPhone = searchParams.get('contactPhone') || '';
  const requestedMessageSid = searchParams.get('messageSid') || '';

  async function refreshActivity({ silent = false } = {}) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const limit = getActivityLimit(days);
      const [conversationsData, messagesData, optOutsData, analyticsData, notificationEventsData, digestData] = await Promise.all([
        fetchSmsConversations(Math.min(100, Math.ceil(limit / 2))),
        fetchSmsMessages(limit),
        fetchSmsOptOuts(Math.min(200, limit)),
        fetchSmsAnalytics(days),
        fetchSmsNotificationEvents(Math.min(200, limit), days),
        fetchSmsDailyDigest(1),
      ]);

      setActivity({
        conversations: conversationsData.conversations || [],
        messages: messagesData.messages || [],
        optOuts: optOutsData.optOuts || [],
        notificationEvents: notificationEventsData.events || [],
      });
      setAnalytics(analyticsData.analytics || null);
      setDigestSummary(digestData.summary || null);
    } catch (activityError) {
      setError(activityError?.response?.data?.error || 'Failed to load SMS activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSendDailyDigest() {
    try {
      setSendingDigest(true);
      setError('');
      setSuccess('');
      await sendSmsDailyDigest({ days: 1 });
      await refreshActivity({ silent: true });
      setSuccess('Daily digest sent.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send daily digest.');
    } finally {
      setSendingDigest(false);
    }
  }

  useEffect(() => {
    refreshActivity();
  }, [days]);

  useEffect(() => {
    if (!requestedConversationPhone) {
      return;
    }
    setSelectedConversationPhone(requestedConversationPhone);
    setManualSendForm((current) => ({
      ...current,
      to: current.to || requestedConversationPhone,
    }));
  }, [requestedConversationPhone]);

  useEffect(() => {
    if (!requestedMessageSid || selectedConversationPhone) {
      return;
    }
    const matchedMessage = activity.messages.find(
      (message) => message.providerMessageSid === requestedMessageSid
    );
    if (!matchedMessage) {
      return;
    }
    const resolvedPhone =
      matchedMessage.contactPhone || matchedMessage.to || matchedMessage.from || '';
    if (!resolvedPhone) {
      return;
    }
    setSelectedConversationPhone(resolvedPhone);
    setManualSendForm((current) => ({
      ...current,
      to: current.to || resolvedPhone,
    }));
  }, [activity.messages, requestedMessageSid, selectedConversationPhone]);

  async function handleManualSend() {
    if (!manualSendForm.to.trim() || !manualSendForm.body.trim()) {
      setError('Enter a destination number and message body for the manual SMS.');
      return;
    }

    try {
      setSendingManual(true);
      setError('');
      setSuccess('');
      await sendManualSms({
        to: manualSendForm.to.trim(),
        body: manualSendForm.body.trim(),
      });
      setManualSendForm({ to: '', body: '' });
      await refreshActivity({ silent: true });
      setSuccess('Manual SMS sent.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send manual SMS.');
    } finally {
      setSendingManual(false);
    }
  }

  const activitySummary = useMemo(() => {
    const deliveredCount = activity.messages.filter(
      (message) => String(message.status || '').toLowerCase() === 'delivered'
    ).length;

    return [
      { label: 'Recent conversations', value: activity.conversations.length },
      { label: 'Recent messages', value: activity.messages.length },
      { label: 'Delivered', value: deliveredCount },
      { label: 'Notification events', value: activity.notificationEvents.length },
      { label: 'Opted out', value: activity.optOuts.length },
    ];
  }, [activity]);

  const filteredMessages = useMemo(() => {
    if (!selectedConversationPhone) {
      return activity.messages;
    }

    return activity.messages.filter((message) => {
      const contactPhone = message.contactPhone || message.to || message.from || '';
      return contactPhone === selectedConversationPhone;
    });
  }, [activity.messages, selectedConversationPhone]);

  function handleExportSummary() {
    if (!analytics) return;

    setExporting(true);
    try {
      const rows = [
        ['Metric', 'Value'],
        ['Window (days)', analytics.window?.days || days],
        ['Messages', analytics.totals?.messages || 0],
        ['Outbound', analytics.totals?.outbound || 0],
        ['Inbound', analytics.totals?.inbound || 0],
        ['Delivered', analytics.totals?.delivered || 0],
        ['Failed', analytics.totals?.failed || 0],
        ['Delivery Rate', analytics.deliveryRate || 0],
        ['Opt-Outs', analytics.totals?.optOuts || 0],
        ['Post-Call Evaluated', analytics.totals?.postCallEvaluated || 0],
        ['Post-Call Sent', analytics.totals?.postCallSent || 0],
        [],
        ['Alert Severity', 'Title', 'Message'],
        ...(analytics.alerts || []).map((alert) => [alert.severity, alert.title, alert.message]),
        [],
        ['Delivery Status', 'Count'],
        ...(analytics.deliveryStatuses || []).map((item) => [item.key, item.value]),
        [],
        ['Automation Type', 'Count'],
        ...(analytics.automationTypes || []).map((item) => [item.key, item.value]),
        [],
        ['Suppression Reason', 'Count'],
        ...(analytics.suppressionReasons || []).map((item) => [item.key, item.value]),
        [],
        ['Notification Event', 'Count'],
        ...Object.entries(
          (activity.notificationEvents || []).reduce((acc, event) => {
            const key = `${event.recipientRole || 'unknown'}:${event.channel || 'unknown'}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {})
        ),
        [],
        ['Date', 'Outbound', 'Delivered', 'Inbound', 'Opt-Outs', 'Post-Call Sent', 'Post-Call Suppressed'],
        ...(analytics.trend || []).map((item) => [
          item.date,
          item.outbound,
          item.delivered,
          item.inbound,
          item.optOuts,
          item.postCallSent,
          item.postCallSuppressed,
        ]),
      ];

      downloadCsv(`merxus-sms-summary-${tenantType}-${days}d.csv`, rows);
    } finally {
      setExporting(false);
    }
  }

  function handleExportMessages() {
    setExporting(true);
    try {
      const rows = [
        ['Time', 'Direction', 'Contact', 'Status', 'Automation Type', 'Body'],
        ...filteredMessages.map((message) => [
          formatTimestamp(message.createdAt),
          message.direction || '',
          message.contactPhone || message.to || message.from || '',
          message.status || '',
          message.metadata?.automationType || '',
          message.body || '',
        ]),
      ];

      const suffix = selectedConversationPhone
        ? selectedConversationPhone.replace(/[^\d+]/g, '')
        : `${days}d`;
      downloadCsv(`merxus-sms-messages-${tenantType}-${suffix}.csv`, rows);
    } finally {
      setExporting(false);
    }
  }

  function handleExportNotificationEvents() {
    setExporting(true);
    try {
      const rows = [
        ['Time', 'Role', 'Channel', 'Status', 'Event Type', 'Destination', 'Call Session'],
        ...(activity.notificationEvents || []).map((event) => [
          formatTimestamp(event.createdAt),
          event.recipientRole || '',
          event.channel || '',
          event.status || '',
          event.eventType || '',
          event.to || event.toUserId || '',
          event.callSessionId || '',
        ]),
      ];

      downloadCsv(`merxus-notification-events-${tenantType}-${days}d.csv`, rows);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card">
      {showHeader ? (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{copy.subtitle}</p>
          </div>
          <Link to={copy.notificationsRoute} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Open Notification Center
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          {success}
        </div>
      ) : null}

      <div className="mb-6">
        <SmsAnalyticsPanel
          analytics={analytics}
          loading={loading && !analytics}
          days={days}
          onDaysChange={setDays}
        />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Daily Digest</h4>
            <p className="text-xs text-gray-500">
              One-day operating snapshot built from notification events, SMS traffic, and post-call outcomes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSendDailyDigest}
            className="btn-primary whitespace-nowrap"
            disabled={sendingDigest}
          >
            {sendingDigest ? 'Sending...' : 'Send Daily Summary Now'}
          </button>
        </div>

        {digestSummary ? (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Calls</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{digestSummary.totals?.calls || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notifications</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{digestSummary.totals?.notifications || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Suppressed</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{digestSummary.totals?.suppressed || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Inbound SMS</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{digestSummary.totals?.inboundMessages || 0}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top Event Types</p>
                {digestSummary.eventCounts?.length ? (
                  <div className="mt-2 space-y-2">
                    {digestSummary.eventCounts.slice(0, 4).map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="font-semibold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No classified call outcomes in the current digest window.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Highlights</p>
                {digestSummary.highlights?.length ? (
                  <div className="mt-2 space-y-2">
                    {digestSummary.highlights.slice(0, 3).map((highlight) => (
                      <div key={highlight.id} className="rounded-lg border border-gray-200 p-3">
                        <p className="text-sm font-medium text-gray-900">{String(highlight.eventType || '').replace(/_/g, ' ')}</p>
                        <p className="mt-1 text-xs text-gray-600">
                          {highlight.callerName || 'Unknown caller'}{highlight.callerPhone ? ` • ${highlight.callerPhone}` : ''}{highlight.channel ? ` • ${String(highlight.channel).toUpperCase()}` : ''}
                        </p>
                        {highlight.objectSummary ? (
                          <p className="mt-2 text-xs font-medium text-gray-700">{highlight.objectSummary}</p>
                        ) : null}
                        {highlight.summary ? (
                          <p className="mt-2 text-sm text-gray-600">{highlight.summary}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-gray-500">{highlight.occurredAt}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No notable call highlights yet for today.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No digest summary available yet.</p>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Thread Overview</h4>
          <p className="text-xs text-gray-500">
            Review recent SMS activity, delivery state, and suppression status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportSummary}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={exporting || !analytics}
          >
            Export Summary CSV
          </button>
          <button
            type="button"
            onClick={handleExportMessages}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={exporting || filteredMessages.length === 0}
          >
            Export Messages CSV
          </button>
          <button
            type="button"
            onClick={handleExportNotificationEvents}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={exporting || activity.notificationEvents.length === 0}
          >
            Export Notification Events CSV
          </button>
          <button
            type="button"
            onClick={() => refreshActivity({ silent: true })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {activitySummary.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">Manual Send</h5>
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <input
            type="tel"
            className="input-field"
            value={manualSendForm.to}
            onChange={(event) => setManualSendForm((prev) => ({ ...prev, to: event.target.value }))}
            placeholder="+15551234567"
          />
          <textarea
            rows="3"
            className="input-field"
            value={manualSendForm.body}
            onChange={(event) => setManualSendForm((prev) => ({ ...prev, body: event.target.value }))}
            placeholder="Send a one-off compliant message..."
          />
          <button
            type="button"
            onClick={handleManualSend}
            className="btn-primary h-fit"
            disabled={sendingManual}
          >
            {sendingManual ? 'Sending...' : 'Send Manual SMS'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Recent Conversations</h5>
          {loading ? (
            <p className="text-sm text-gray-500">Loading conversations...</p>
          ) : activity.conversations.length === 0 ? (
            <p className="text-sm text-gray-500">No SMS conversations yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Last direction</th>
                    <th className="px-4 py-3">Messages</th>
                    <th className="px-4 py-3">Last updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activity.conversations.map((conversation) => (
                    <tr
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversationPhone(conversation.contactPhone || '');
                        setManualSendForm((prev) => ({
                          ...prev,
                          to: conversation.contactPhone || prev.to,
                        }));
                      }}
                      className={`cursor-pointer ${
                        selectedConversationPhone === (conversation.contactPhone || '')
                          ? 'bg-primary-50'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{conversation.contactPhone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{conversation.lastDirection || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{conversation.messageCount || 0}</td>
                      <td className="px-4 py-3 text-gray-600">{formatTimestamp(conversation.lastMessageAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Opt-Out List</h5>
          {loading ? (
            <p className="text-sm text-gray-500">Loading opt-outs...</p>
          ) : activity.optOuts.length === 0 ? (
            <p className="text-sm text-gray-500">No opted-out numbers recorded.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activity.optOuts.map((optOut) => (
                    <tr key={optOut.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{optOut.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{optOut.status || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{optOut.source || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatTimestamp(optOut.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">Notification Events</h5>
        {loading ? (
          <p className="text-sm text-gray-500">Loading notification events...</p>
        ) : activity.notificationEvents.length === 0 ? (
          <p className="text-sm text-gray-500">No notification events recorded in this window.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activity.notificationEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-gray-600">{formatTimestamp(event.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{event.recipientRole || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 uppercase">{event.channel || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{event.to || event.toUserId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{String(event.eventType || '—').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getNotificationTone(event.status)}`}>
                        {event.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold text-gray-900">
            {selectedConversationPhone
              ? `Conversation Thread: ${selectedConversationPhone}`
              : 'Recent Messages'}
          </h5>
          {selectedConversationPhone ? (
            <button
              type="button"
              onClick={() => setSelectedConversationPhone('')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear Filter
            </button>
          ) : null}
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading messages...</p>
        ) : filteredMessages.length === 0 ? (
          <p className="text-sm text-gray-500">No SMS message history yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMessages.map((message) => (
                  <tr
                    key={message.id}
                    className={message.providerMessageSid === requestedMessageSid ? 'bg-primary-50' : ''}
                  >
                    <td className="px-4 py-3 text-gray-600">{formatTimestamp(message.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{message.direction || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{message.contactPhone || message.to || message.from || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="max-w-lg truncate" title={message.body || ''}>
                        {message.body || '—'}
                      </div>
                      {message.providerMessageSid === requestedMessageSid ? (
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
                          Source message
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusTone(message.status)}`}>
                        {message.status || 'unknown'}
                      </span>
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
