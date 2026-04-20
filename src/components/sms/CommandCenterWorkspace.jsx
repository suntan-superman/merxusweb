import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchCommandCenterDashboard,
  triggerSlackCommandCenterDemo,
} from '../../api/sms';
import PlanGateCard from '../billing/PlanGateCard';
import SelectField from '../common/SelectField';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Merxus Command Center',
      subtitle: 'Run reservations, orders, missed-call recovery, and staff notifications from one live operations surface.',
      billingRoute: '/restaurant/billing',
      settingsRoute: '/restaurant/settings?tab=sms',
      callsRoute: '/restaurant/calls',
      inboxRoute: '/restaurant/sms',
      notificationsRoute: '/restaurant/notifications',
      intelligenceRoute: '/restaurant/intelligence',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      title: 'Merxus Command Center',
      subtitle: 'Monitor lead capture, showing activity, callback follow-up, and notification health from one command surface.',
      billingRoute: '/estate/billing',
      settingsRoute: '/estate/settings?tab=sms',
      callsRoute: '/estate/calls',
      inboxRoute: '/estate/sms',
      notificationsRoute: '/estate/notifications',
      intelligenceRoute: '/estate/intelligence',
    };
  }

  return {
    title: 'Merxus Command Center',
    subtitle: 'Coordinate calls, message follow-up, work items, and automation health from one live operations hub.',
    billingRoute: '/voice/billing',
    settingsRoute: '/voice/settings?tab=sms',
    callsRoute: '/voice/calls',
    inboxRoute: '/voice/sms',
    notificationsRoute: '/voice/notifications',
    intelligenceRoute: '/voice/intelligence',
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

function toneClass(tone) {
  if (tone === 'danger') return 'bg-red-100 text-red-700';
  if (tone === 'warning') return 'bg-amber-100 text-amber-700';
  if (tone === 'positive') return 'bg-green-100 text-green-700';
  if (tone === 'info') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

function alertPanelClass(tone) {
  if (tone === 'danger') return 'border-red-200 bg-red-50 text-red-800';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

function subscriptionBadgeClass(tier) {
  if (tier === 'elite') return 'bg-amber-100 text-amber-800';
  if (tier === 'professional') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

function LockedSectionCard({ lockedSection, fallbackPath }) {
  if (!lockedSection) return null;

  return (
    <PlanGateCard
      className="mt-5"
      requiredTier={lockedSection.requiredTier}
      title={lockedSection.title}
      description={lockedSection.description}
      actionPath={lockedSection.actionPath || fallbackPath}
      actionLabel={lockedSection.actionLabel || 'Compare plans'}
    />
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'rate_limited', label: 'Rate limited' },
  { value: 'disabled', label: 'Disabled' },
];

export default function CommandCenterWorkspace({ tenantType }) {
  const navigate = useNavigate();
  const copy = copyForTenant(tenantType);
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingDemo, setSendingDemo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadDashboard({ silent = false } = {}) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      const data = await fetchCommandCenterDashboard({
        days,
        status: status || undefined,
        eventType: eventType || undefined,
      });
      setDashboard(data.dashboard || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || 'Failed to load Command Center dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [days, status, eventType]);

  async function handleSendDemo() {
    try {
      setSendingDemo(true);
      setError('');
      setSuccess('');
      await triggerSlackCommandCenterDemo();
      await loadDashboard({ silent: true });
      setSuccess('Command Center demo events sent.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send Command Center demo.');
    } finally {
      setSendingDemo(false);
    }
  }

  const eventOptions = useMemo(() => {
    const supported = dashboard?.supportedEventTypes || [];
    return supported.map((value) => ({
      value,
      label: formatLabel(value),
    }));
  }, [dashboard?.supportedEventTypes]);

  const kpis = dashboard?.kpis || [];
  const liveFeed = dashboard?.liveFeed || [];
  const actionQueue = dashboard?.actionQueue || [];
  const queueHealth = dashboard?.queueHealth || null;
  const topFeedActivity = dashboard?.topFeedActivity || [];
  const channelPerformance = dashboard?.channelPerformance || [];
  const watchlist = dashboard?.watchlist || [];
  const history = dashboard?.history || [];
  const commandSummary = dashboard?.summaries?.command || {};
  const callSummary = dashboard?.summaries?.calls || {};
  const subscription = dashboard?.subscription || null;
  const liveFeedLocked = dashboard?.liveFeedLocked || null;
  const actionQueueLocked = dashboard?.actionQueueLocked || null;
  const channelPerformanceLocked = dashboard?.channelPerformanceLocked || null;
  const watchlistLocked = dashboard?.watchlistLocked || null;

  return (
    <section className="space-y-6">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">Operations Hub</p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{copy.subtitle}</p>
            {subscription ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ${subscriptionBadgeClass(subscription.tier)}`}>
                  {subscription.tierLabel} Plan
                </span>
                <span className="text-slate-500">
                  Billing status: <span className="font-medium capitalize text-slate-700">{subscription.status}</span>
                </span>
              </div>
            ) : null}
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
              onClick={() => loadDashboard({ silent: true })}
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
            <div key={item.key || item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
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

          {loading && liveFeed.length === 0 && !liveFeedLocked ? (
            <p className="mt-4 text-sm text-gray-500">Loading live operations feed...</p>
          ) : liveFeedLocked ? (
            <LockedSectionCard lockedSection={liveFeedLocked} fallbackPath={copy.billingRoute} />
          ) : liveFeed.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No recent operational events in the current window.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {liveFeed.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(item.tone)}`}>
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
                    {item.actionPath ? (
                      <div className="flex shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(item.actionPath)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {item.actionLabel}
                        </button>
                      </div>
                    ) : null}
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

          {actionQueueLocked ? (
            <LockedSectionCard lockedSection={actionQueueLocked} fallbackPath={copy.billingRoute} />
          ) : actionQueue.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">No active automation alerts</p>
              <p className="mt-1 text-sm text-slate-500">
                The queue is clear. New alert ownership and escalation items will surface here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {actionQueue.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${alertPanelClass(item.tone)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide">{item.severity}</p>
                    {item.snoozedUntil ? <p className="text-xs opacity-80">Snoozed until {formatDate(item.snoozedUntil)}</p> : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm">{item.message}</p>
                  <div className="mt-3 space-y-1 text-xs opacity-80">
                    <p>Job: {item.jobLabel}</p>
                    <p>Consecutive failures: {item.consecutiveFailures}</p>
                    <p>Owner: {item.ownerLabel}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.primaryActionPath ? (
                      <button
                        type="button"
                        onClick={() => navigate(item.primaryActionPath)}
                        className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      >
                        {item.primaryActionLabel || 'Open alert queue'}
                      </button>
                    ) : null}
                    {item.secondaryActionPath ? (
                      <button
                        type="button"
                        onClick={() => navigate(item.secondaryActionPath)}
                        className="rounded-md border border-current px-3 py-1.5 text-xs font-medium hover:bg-white/70"
                      >
                        {item.secondaryActionLabel || 'Open related workflow'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {queueHealth ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue Health</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Owned</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{queueHealth.totals?.owned || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Unowned</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{queueHealth.totals?.unowned || 0}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p>Average unowned age: {queueHealth.unownedAges?.averageHours || 0}h</p>
                <p>Oldest unowned alert: {queueHealth.unownedAges?.oldestHours || 0}h</p>
                <p>
                  Top owner:{' '}
                  {queueHealth.ownerCounts?.[0]
                    ? `${queueHealth.ownerCounts[0].owner} (${queueHealth.ownerCounts[0].count})`
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
            {topFeedActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No feed activity in the current filter.</p>
            ) : (
              topFeedActivity.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 capitalize">{item.label}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.value}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Channel Performance</h3>
          <p className="mt-1 text-sm text-gray-500">Quick operating read across calls, messaging, and downstream delivery.</p>
          {channelPerformanceLocked ? (
            <LockedSectionCard lockedSection={channelPerformanceLocked} fallbackPath={copy.billingRoute} />
          ) : (
            <div className="mt-4 space-y-3">
              {channelPerformance.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{item.helper}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Trends and Watchlist</h3>
          <p className="mt-1 text-sm text-gray-500">High-signal issues and highlights surfaced from backend analytics and digest data.</p>
          {watchlistLocked ? (
            <LockedSectionCard lockedSection={watchlistLocked} fallbackPath={copy.billingRoute} />
          ) : (
            <div className="mt-4 space-y-3">
              {watchlist.length === 0 ? (
                <p className="text-sm text-gray-500">No watchlist items available yet.</p>
              ) : (
                watchlist.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                    <p className="mt-2 text-sm text-gray-800">{item.value}</p>
                  </div>
                ))
              )}
            </div>
          )}
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
            options={eventOptions}
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
            <span>{commandSummary.channels || 0} active Slack channels</span>
            <span>{callSummary.total || 0} scoped calls</span>
          </div>
        </div>

        {loading && history.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Loading Command Center history...</p>
        ) : history.length === 0 ? (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-600">{formatDate(item.createdAt)}</td>
                    <td className="px-3 py-2 text-gray-900 capitalize">{formatLabel(item.eventType)}</td>
                    <td className="px-3 py-2 text-gray-600">{item.slackChannel || 'Default'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(
                        item.status === 'sent' ? 'positive' : item.status === 'duplicate' || item.status === 'rate_limited' || item.status === 'disabled' ? 'warning' : 'neutral'
                      )}`}>
                        {formatLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{item.customerName || item.callerPhone || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{item.summary || item.subject || item.reason || '—'}</td>
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
