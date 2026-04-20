import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  useFeedbackSettings,
  useInternalFeedbackDetail,
  useInternalFeedbackQueue,
  useReviewAlerts,
  useReviewIntegrations,
  useReviewsWorkspace,
  useUpdateInternalFeedback,
} from '../../hooks/useReviewQueries';
import {
  buildFeedbackWorkspacePathWithParams,
  feedbackWorkspaceItemMatchesView,
  formatFeedbackWorkspaceDate,
  getFeedbackWorkspacePriorityTone,
  getFeedbackWorkspaceStatusTone,
  isFeedbackWorkspaceItemOwnedByCurrentUser,
  normalizeFeedbackWorkspaceView,
  previewFeedbackWorkspaceText,
} from '../../utils/feedbackWorkspace';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Feedback Command',
      subtitle: 'Keep public reputation, source connectivity, and follow-up risk in one operating view.',
      reviewsPath: '/restaurant/reviews',
      integrationsPath: '/restaurant/feedback/integrations',
      notificationsPath: '/restaurant/notifications',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      title: 'Feedback Command',
      subtitle: 'Track reputation signals, platform health, and review-triggered escalation across listing and lead workflows.',
      reviewsPath: '/estate/reviews',
      integrationsPath: '/estate/feedback/integrations',
      notificationsPath: '/estate/notifications',
    };
  }

  return {
    title: 'Feedback Command',
    subtitle: 'Coordinate public reviews, service recovery, and channel readiness from the same operator workspace.',
    reviewsPath: '/voice/reviews',
    integrationsPath: '/voice/feedback/integrations',
    notificationsPath: '/voice/notifications',
  };
}

function formatHours(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value)}h`;
}

export default function FeedbackWorkspace({ tenantType }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const copy = copyForTenant(tenantType);
  const { data: reviewsData, isLoading: reviewsLoading, error: reviewsError } = useReviewsWorkspace({ days: 30, limit: 8 });
  const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError } = useReviewIntegrations();
  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useReviewAlerts({ days: 30, limit: 100 });
  const { data: feedbackSettingsData, isLoading: feedbackSettingsLoading, error: feedbackSettingsError } = useFeedbackSettings();
  const { data: internalFeedbackQueueData, isLoading: internalFeedbackQueueLoading, error: internalFeedbackQueueError } = useInternalFeedbackQueue({ days: 30, limit: 25 });
  const [activeFeedbackView, setActiveFeedbackView] = useState(
    normalizeFeedbackWorkspaceView(searchParams.get('feedbackView'))
  );
  const [selectedFeedbackId, setSelectedFeedbackId] = useState('');
  const { data: internalFeedbackDetailData, isLoading: internalFeedbackDetailLoading } = useInternalFeedbackDetail(selectedFeedbackId);
  const updateInternalFeedback = useUpdateInternalFeedback();
  const [resolutionDraft, setResolutionDraft] = useState('');

  const summary = reviewsData?.summary || {};
  const reviewItems = reviewsData?.items || [];
  const integrations = integrationsData?.integrations || [];
  const alerts = alertsData?.events || [];
  const internalFeedbackItems = internalFeedbackQueueData?.items || [];
  const internalFeedbackSummary = internalFeedbackQueueData?.summary || {};
  const internalFeedbackAnalytics = internalFeedbackQueueData?.analytics || {};
  const funnelStats = feedbackSettingsData?.stats || {};
  const recentResponses = feedbackSettingsData?.recentResponses || [];
  const funnel = feedbackSettingsData?.funnel || {};
  const selectedInternalFeedback = internalFeedbackDetailData?.feedback || null;

  const priorityQueue = useMemo(
    () =>
      reviewItems
        .filter((item) => item.replyState !== 'posted')
        .slice(0, 5),
    [reviewItems]
  );
  const visibleInternalFeedbackItems = useMemo(
    () =>
      internalFeedbackItems.filter((item) =>
        feedbackWorkspaceItemMatchesView(item, activeFeedbackView, user)
      ),
    [activeFeedbackView, internalFeedbackItems, user]
  );
  const feedbackViews = useMemo(() => {
    const views = [
      { key: 'all', label: 'All', count: internalFeedbackItems.length },
      { key: 'open', label: 'Open', count: internalFeedbackSummary.open ?? internalFeedbackItems.filter((item) => ['new', 'in_progress'].includes(String(item.status || '').toLowerCase())).length },
      { key: 'new', label: 'New', count: internalFeedbackSummary.new ?? internalFeedbackItems.filter((item) => item.status === 'new').length },
      { key: 'in_progress', label: 'In Progress', count: internalFeedbackSummary.inProgress ?? internalFeedbackItems.filter((item) => item.status === 'in_progress').length },
      { key: 'critical', label: 'Critical', count: internalFeedbackSummary.critical ?? internalFeedbackItems.filter((item) => item.priority === 'critical').length },
      { key: 'unassigned', label: 'Unassigned', count: internalFeedbackSummary.unassigned ?? internalFeedbackItems.filter((item) => !item.assignee?.uid && !item.assignee?.email && !item.assignee?.name).length },
      { key: 'resolved', label: 'Resolved', count: internalFeedbackSummary.resolved ?? internalFeedbackItems.filter((item) => item.status === 'resolved').length },
    ];

    if (user?.uid || user?.email) {
      views.push({
        key: 'mine',
        label: 'My Queue',
        count: internalFeedbackItems.filter((item) => feedbackWorkspaceItemMatchesView(item, 'mine', user)).length,
      });
    }

    return views;
  }, [internalFeedbackItems, internalFeedbackSummary, user]);

  useEffect(() => {
    const requestedView = normalizeFeedbackWorkspaceView(searchParams.get('feedbackView'));
    setActiveFeedbackView((current) => (current === requestedView ? current : requestedView));
  }, [searchParams]);

  useEffect(() => {
    if (!internalFeedbackItems.length) {
      if (selectedFeedbackId) {
        setSelectedFeedbackId('');
      }
      return;
    }

    const requestedFeedbackId = searchParams.get('feedbackId') || '';
    if (requestedFeedbackId && visibleInternalFeedbackItems.some((item) => item.id === requestedFeedbackId)) {
      if (requestedFeedbackId !== selectedFeedbackId) {
        setSelectedFeedbackId(requestedFeedbackId);
      }
      return;
    }

    const hasCurrent = visibleInternalFeedbackItems.some((item) => item.id === selectedFeedbackId);
    if (!hasCurrent) {
      setSelectedFeedbackId(visibleInternalFeedbackItems[0]?.id || '');
    }
  }, [internalFeedbackItems, searchParams, selectedFeedbackId, visibleInternalFeedbackItems]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (activeFeedbackView === 'all') {
      nextParams.delete('feedbackView');
    } else if (nextParams.get('feedbackView') !== activeFeedbackView) {
      nextParams.set('feedbackView', activeFeedbackView);
    }

    if (!selectedFeedbackId) {
      nextParams.delete('feedbackId');
    } else if (nextParams.get('feedbackId') !== selectedFeedbackId) {
      nextParams.set('feedbackId', selectedFeedbackId);
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeFeedbackView, searchParams, selectedFeedbackId, setSearchParams]);

  useEffect(() => {
    setResolutionDraft(selectedInternalFeedback?.resolutionNotes || '');
  }, [selectedInternalFeedback?.id, selectedInternalFeedback?.resolutionNotes]);

  const connectedIntegrations = integrations.filter((item) => item.status === 'connected' || item.status === 'detected').length;
  const loadError =
    reviewsError?.response?.data?.error ||
    integrationsError?.response?.data?.error ||
    feedbackSettingsError?.response?.data?.error ||
    internalFeedbackQueueError?.response?.data?.error ||
    alertsError?.response?.data?.error ||
    '';

  async function handleUpdateInternalFeedback(feedbackId, payload, { select = false } = {}) {
    if (!feedbackId) return;
    if (select) {
      setSelectedFeedbackId(feedbackId);
    }
    await updateInternalFeedback.mutateAsync({
      feedbackId,
      payload,
    });
  }

  function handleFeedbackCardAction(event, feedbackId, payload, options = {}) {
    event.stopPropagation();
    event.preventDefault();
    handleUpdateInternalFeedback(feedbackId, payload, options);
  }

  return (
    <section className="space-y-6">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">Elite Feedback</p>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-gray-900">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={copy.reviewsPath} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
              Open Reviews
            </Link>
            <Link to={copy.integrationsPath} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
              Manage Integrations
            </Link>
            <Link to={copy.notificationsPath} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
              Open Notifications
            </Link>
          </div>
        </div>

        {loadError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.metrics?.averageRating ?? '—'}</p>
            <p className="mt-2 text-xs text-slate-500">Filtered public review average</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Replies</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.totals?.pendingReply ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Reviews still needing response handling</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review Alerts</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{alerts.length}</p>
            <p className="mt-2 text-xs text-slate-500">Review spikes, negative reviews, and low-rating feedback in the last 30 days</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected Sources</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{connectedIntegrations}</p>
            <p className="mt-2 text-xs text-slate-500">Review sources with active or detected sync activity</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feedback Response Rate</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{funnelStats.responseRate ?? 0}%</p>
            <p className="mt-2 text-xs text-slate-500">Recent feedback requests that received a rating reply</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery Queue</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{internalFeedbackSummary.open ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Low-rating feedback items still awaiting service recovery follow-up</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery Overdue</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{internalFeedbackSummary.overdue24h ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Open recovery items older than 24 hours</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Low-Rating Recovery Queue</h3>
            <p className="mt-1 text-xs text-gray-500">
              Internal feedback records created by the SMS funnel. Work these like customer-recovery tasks without forcing them into the public review queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
              Open {internalFeedbackSummary.open ?? 0}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
              In Progress {internalFeedbackSummary.inProgress ?? 0}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Resolved {internalFeedbackSummary.resolved ?? 0}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue Focus</p>
              <p className="mt-1 text-sm text-slate-600">Filter the recovery queue by open status, severity, and ownership.</p>
            </div>
            {activeFeedbackView !== 'all' ? (
              <button
                type="button"
                onClick={() => setActiveFeedbackView('all')}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear focus
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {feedbackViews.map((view) => {
              const selected = activeFeedbackView === view.key;
              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setActiveFeedbackView(view.key)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    selected
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {view.label} <span className="ml-1 text-[11px] opacity-80">{view.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unassigned Open</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{internalFeedbackSummary.unassignedOpen ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Open recovery tasks still waiting for an owner</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oldest Open</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatHours(internalFeedbackAnalytics?.aging?.oldestOpenAgeHours)}</p>
            <p className="mt-2 text-xs text-slate-500">Longest-running active recovery item in the current window</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Open Age</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatHours(internalFeedbackAnalytics?.aging?.avgOpenAgeHours)}</p>
            <p className="mt-2 text-xs text-slate-500">Average age of open recovery items</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Resolution</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatHours(internalFeedbackAnalytics?.aging?.avgResolutionHours)}</p>
            <p className="mt-2 text-xs text-slate-500">{internalFeedbackSummary.resolutionRate ?? 0}% of items resolved in the current window</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery Sources</p>
            {(internalFeedbackAnalytics?.bySource || []).length ? (
              <div className="mt-3 space-y-2">
                {internalFeedbackAnalytics.bySource.slice(0, 5).map((item) => (
                  <div key={item.sourceType} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
                    <span className="text-sm text-slate-600">{item.sourceType.replace(/_/g, ' ')}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No source attribution is available yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery Trend</p>
            {(internalFeedbackAnalytics?.trends?.daily || []).length ? (
              <div className="mt-3 space-y-2">
                {internalFeedbackAnalytics.trends.daily.map((item) => (
                  <div key={item.date} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-white px-2.5 py-1">New {item.created}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">Resolved {item.resolved}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">Reopened {item.reopened}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No short-term recovery trend data is available yet.</p>
            )}
          </div>
        </div>

        {internalFeedbackQueueLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading internal feedback queue…</p>
        ) : internalFeedbackItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No low-rating feedback items are waiting right now.</p>
        ) : visibleInternalFeedbackItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No recovery items match the current queue focus.</p>
        ) : (
          <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {visibleInternalFeedbackItems.map((item) => {
                const selected = item.id === selectedFeedbackId;
                const canTakeOwnership = !isFeedbackWorkspaceItemOwnedByCurrentUser(item, user);
                const canResolve = !['resolved', 'dismissed'].includes(String(item.status || '').toLowerCase());
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedFeedbackId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedFeedbackId(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspacePriorityTone(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspaceStatusTone(item.status)}`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {item.rating ? `${item.rating}/5` : 'No rating'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.contactPhone || 'Unknown contact'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sourceType ? item.sourceType.replace(/_/g, ' ') : 'feedback response'}
                          {item.assignee?.name ? ` • ${item.assignee.name}` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{formatFeedbackWorkspaceDate(item.createdAt)}</p>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-slate-700">{item.summary || 'No customer note stored.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {item.isOpen ? (
                        <span className="rounded-full bg-white px-2.5 py-1">Open {formatHours(item.openAgeHours)}</span>
                      ) : item.resolutionHours != null ? (
                        <span className="rounded-full bg-white px-2.5 py-1">Resolved in {formatHours(item.resolutionHours)}</span>
                      ) : null}
                      {item.needsOwner ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Needs owner</span>
                      ) : null}
                      {item.overdue24h ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Over 24h old</span>
                      ) : null}
                    </div>
                    {item.resolutionNotes ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Notes:</span> {previewFeedbackWorkspaceText(item.resolutionNotes)}
                      </div>
                    ) : null}
                    {item.interactionEvent?.summary ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Interaction:</span> {previewFeedbackWorkspaceText(item.interactionEvent.summary)}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canTakeOwnership ? (
                        <button
                          type="button"
                          onClick={(event) => handleFeedbackCardAction(event, item.id, { assignToSelf: true }, { select: true })}
                          disabled={updateInternalFeedback.isPending}
                          className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Take Ownership
                        </button>
                      ) : null}
                      {item.assignee?.name || item.assignee?.email ? (
                        <button
                          type="button"
                          onClick={(event) => handleFeedbackCardAction(event, item.id, { clearAssignment: true }, { select: true })}
                          disabled={updateInternalFeedback.isPending}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Clear Owner
                        </button>
                      ) : null}
                      {String(item.status || '').toLowerCase() === 'new' ? (
                        <button
                          type="button"
                          onClick={(event) => handleFeedbackCardAction(event, item.id, { status: 'in_progress' }, { select: true })}
                          disabled={updateInternalFeedback.isPending}
                          className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Start Triage
                        </button>
                      ) : null}
                      {canResolve ? (
                        <button
                          type="button"
                          onClick={(event) => handleFeedbackCardAction(event, item.id, { status: 'resolved' }, { select: true })}
                          disabled={updateInternalFeedback.isPending}
                          className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => handleFeedbackCardAction(event, item.id, { status: 'new' }, { select: true })}
                          disabled={updateInternalFeedback.isPending}
                          className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              {internalFeedbackDetailLoading ? (
                <p className="text-sm text-gray-500">Loading recovery detail…</p>
              ) : !selectedInternalFeedback ? (
                <p className="text-sm text-gray-500">Select a recovery item to inspect the feedback context and record follow-up.</p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspacePriorityTone(selectedInternalFeedback.priority)}`}>
                          {selectedInternalFeedback.priority}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspaceStatusTone(selectedInternalFeedback.status)}`}>
                          {selectedInternalFeedback.status.replace(/_/g, ' ')}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {selectedInternalFeedback.rating ? `${selectedInternalFeedback.rating}/5` : 'No rating'}
                        </span>
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-slate-900">{selectedInternalFeedback.contactPhone || 'Unknown contact'}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Created {formatFeedbackWorkspaceDate(selectedInternalFeedback.createdAt)}
                        {selectedInternalFeedback.assignee?.name ? ` • Owned by ${selectedInternalFeedback.assignee.name}` : ' • Unassigned'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedInternalFeedback.interactionEventId ? (
                        <Link
                          to={`${copy.notificationsPath}?interactionEventId=${encodeURIComponent(selectedInternalFeedback.interactionEventId)}`}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
                        >
                          Open Related Alerts
                        </Link>
                      ) : null}
                      <Link
                        to={buildFeedbackWorkspacePathWithParams(copy.reviewsPath, { view: 'negative' })}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
                      >
                        Open Reputation Queue
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Comment</p>
                    <p className="mt-3 text-sm text-slate-700">{selectedInternalFeedback.comment || selectedInternalFeedback.session?.responseText || 'No written note supplied.'}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feedback Session</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>Source: {selectedInternalFeedback.sourceType ? selectedInternalFeedback.sourceType.replace(/_/g, ' ') : '—'}</p>
                        <p>Session status: {selectedInternalFeedback.session?.status || '—'}</p>
                        <p>Responded: {formatFeedbackWorkspaceDate(selectedInternalFeedback.session?.respondedAt || selectedInternalFeedback.session?.createdAt)}</p>
                        <p>Open age: {selectedInternalFeedback.isOpen ? formatHours(selectedInternalFeedback.openAgeHours) : 'Closed'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Structured Interaction</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>Event type: {selectedInternalFeedback.interactionEvent?.eventType || '—'}</p>
                        <p>Channel: {selectedInternalFeedback.interactionEvent?.channel || '—'}</p>
                        <p>Last action: {formatFeedbackWorkspaceDate(selectedInternalFeedback.lastActionAt)}</p>
                        <p>{selectedInternalFeedback.interactionEvent?.summary || 'No linked interaction summary was stored.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { assignToSelf: true })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Take Ownership
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { clearAssignment: true })}
                        disabled={updateInternalFeedback.isPending || (!selectedInternalFeedback.assignee?.name && !selectedInternalFeedback.assignee?.email)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Clear Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { status: 'in_progress' })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Start Triage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { status: 'resolved', resolutionNotes: resolutionDraft })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { status: 'dismissed', resolutionNotes: resolutionDraft })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { status: 'new' })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reopen
                      </button>
                    </div>

                    <label className="mt-4 block text-sm font-medium text-slate-700">
                      Resolution Notes
                      <textarea
                        rows="4"
                        value={resolutionDraft}
                        onChange={(event) => setResolutionDraft(event.target.value)}
                        className="input-field mt-2"
                        placeholder="Capture the recovery action, follow-up owner, or customer outcome."
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdateInternalFeedback(selectedFeedbackId, { resolutionNotes: resolutionDraft })}
                      disabled={updateInternalFeedback.isPending}
                      className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateInternalFeedback.isPending ? 'Saving…' : 'Save Notes'}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Related Notifications</p>
                      {internalFeedbackDetailData?.relatedNotifications?.length ? (
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          {internalFeedbackDetailData.relatedNotifications.slice(0, 3).map((item) => (
                            <p key={item.id}>
                              {item.channel?.toUpperCase() || 'Notification'} • {item.status || 'unknown'} • {formatFeedbackWorkspaceDate(item.createdAt)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No low-rating notification records were found for this item.</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent History</p>
                      {selectedInternalFeedback.history?.length ? (
                        <div className="mt-3 space-y-3 text-sm text-slate-700">
                          {selectedInternalFeedback.history.slice(-3).reverse().map((entry, index) => (
                            <div key={`${entry.createdAt || 'history'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <p className="font-medium text-slate-900">{entry.status.replace(/_/g, ' ')}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {entry.updatedBy?.name || entry.updatedBy?.email || 'Operator'} • {formatFeedbackWorkspaceDate(entry.createdAt)}
                              </p>
                              {entry.resolutionNotes ? (
                                <p className="mt-2 text-sm text-slate-700">{entry.resolutionNotes}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No recovery actions have been saved yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Priority Queue</h3>
              <p className="mt-1 text-xs text-gray-500">
                Reviews that look sensitive, unresolved, or likely to need public response guidance.
              </p>
            </div>
            <Link to={copy.reviewsPath} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              View all reviews
            </Link>
          </div>

          {reviewsLoading ? (
            <p className="mt-4 text-sm text-gray-500">Loading review queue…</p>
          ) : priorityQueue.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No priority reviews are visible right now.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {priorityQueue.map((item) => (
                <Link
                  key={item.id}
                  to={buildFeedbackWorkspacePathWithParams(copy.reviewsPath, {
                    view: (Number(item.rating) || 0) <= 2 || item.aiSentiment === 'negative' ? 'negative' : 'actionable',
                    reviewId: item.id,
                  })}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{item.platformLabel}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspaceStatusTone(item.aiSentiment === 'negative' ? 'needs_attention' : item.replyState === 'posted' ? 'connected' : 'detected')}`}>
                      {item.aiSentiment}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{item.replyState}</span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.reviewerName}</p>
                      <p className="mt-1 text-xs text-amber-600">{item.rating ? `${item.rating} stars` : 'No rating'}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatFeedbackWorkspaceDate(item.createdAt)}</p>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-700">{item.reviewText || 'No review body stored.'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Feedback Funnel</h3>
                <p className="mt-1 text-xs text-gray-500">
                  SMS feedback requests piggyback on your existing interaction workflow and route low ratings into alerts.
                </p>
              </div>
              <Link to={copy.integrationsPath} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Configure
              </Link>
            </div>

            {feedbackSettingsLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading funnel settings…</p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requests</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{funnelStats.requested ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low Ratings</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{funnelStats.lowRatings ?? 0}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Funnel is {funnel.enabled ? 'enabled' : 'disabled'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Post-call trigger: {funnel.triggerOnPostCall ? 'on' : 'off'} • Inbound SMS trigger: {funnel.triggerOnInboundSms ? 'on' : 'off'} • Low-rating threshold: {funnel.lowRatingThreshold ?? 3}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {recentResponses.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent feedback responses have been recorded yet.</p>
                  ) : (
                    recentResponses.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(item.rating) <= (funnel.lowRatingThreshold ?? 3) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.rating}/5
                          </span>
                          <span className="text-xs text-slate-500">{formatFeedbackWorkspaceDate(item.respondedAt || item.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-700">{item.responseText || 'No written note supplied.'}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Review Alerts</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Notification events already flowing into the existing alert center.
                </p>
              </div>
              <Link to={copy.notificationsPath} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Open alerts
              </Link>
            </div>

            {alertsLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading review alerts…</p>
            ) : alerts.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No review alerts have fired in the current window.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {alerts.slice(0, 4).map((alert) => (
                  <Link
                    key={alert.id}
                    to={`${copy.notificationsPath}?eventId=${encodeURIComponent(alert.id)}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspaceStatusTone(['negative_review', 'feedback_low_rating'].includes(alert.eventType) ? 'needs_attention' : 'detected')}`}>
                        {String(alert.eventType || 'review_alert').replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">{formatFeedbackWorkspaceDate(alert.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">
                      {alert.retryPayload?.body || alert.to || 'Review alert logged in Notification Center.'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Source Integrations</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Connection state is stored in tenant settings and reconciled with actual synced review volume.
                </p>
              </div>
              <Link to={copy.integrationsPath} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Manage
              </Link>
            </div>

            {integrationsLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading integrations…</p>
            ) : (
              <div className="mt-4 space-y-3">
                {integrations.map((integration) => (
                  <div key={integration.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{integration.label}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackWorkspaceStatusTone(integration.status)}`}>
                        {integration.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{integration.description}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      Synced reviews: {integration.syncedReviewCount || 0}
                      {integration.reviewLink ? ' • Invite link configured' : ' • No invite link yet'}
                      {integration.lastUpdatedAt ? ` • Updated ${formatFeedbackWorkspaceDate(integration.lastUpdatedAt)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
