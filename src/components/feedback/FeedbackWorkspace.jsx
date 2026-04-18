import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  useFeedbackSettings,
  useInternalFeedbackDetail,
  useInternalFeedbackQueue,
  useReviewAlerts,
  useReviewIntegrations,
  useReviewsWorkspace,
  useUpdateInternalFeedback,
} from '../../hooks/useReviewQueries';

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

function statusTone(status) {
  if (status === 'connected') return 'bg-emerald-100 text-emerald-700';
  if (status === 'needs_attention' || status === 'attention_required') return 'bg-red-100 text-red-700';
  if (status === 'new') return 'bg-red-100 text-red-700';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700';
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'dismissed') return 'bg-slate-100 text-slate-600';
  if (status === 'detected') return 'bg-sky-100 text-sky-700';
  return 'bg-slate-100 text-slate-700';
}

function priorityTone(priority) {
  if (priority === 'critical') return 'bg-red-100 text-red-700';
  if (priority === 'high') return 'bg-orange-100 text-orange-700';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

export default function FeedbackWorkspace({ tenantType }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const copy = copyForTenant(tenantType);
  const { data: reviewsData, isLoading: reviewsLoading, error: reviewsError } = useReviewsWorkspace({ days: 30, limit: 8 });
  const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError } = useReviewIntegrations();
  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useReviewAlerts({ days: 30, limit: 100 });
  const { data: feedbackSettingsData, isLoading: feedbackSettingsLoading, error: feedbackSettingsError } = useFeedbackSettings();
  const { data: internalFeedbackQueueData, isLoading: internalFeedbackQueueLoading, error: internalFeedbackQueueError } = useInternalFeedbackQueue({ days: 30, limit: 25 });
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
  const funnelStats = feedbackSettingsData?.stats || {};
  const recentResponses = feedbackSettingsData?.recentResponses || [];
  const funnel = feedbackSettingsData?.funnel || {};
  const selectedInternalFeedback = internalFeedbackDetailData?.feedback || null;

  const priorityQueue = useMemo(
    () =>
      reviewItems
        .filter((item) => (Number(item.rating) || 0) <= 3 || item.aiSentiment === 'negative' || item.replyState !== 'posted')
        .slice(0, 5),
    [reviewItems]
  );

  useEffect(() => {
    if (!internalFeedbackItems.length) {
      if (selectedFeedbackId) {
        setSelectedFeedbackId('');
      }
      return;
    }

    const requestedFeedbackId = searchParams.get('feedbackId') || '';
    if (requestedFeedbackId && internalFeedbackItems.some((item) => item.id === requestedFeedbackId)) {
      if (requestedFeedbackId !== selectedFeedbackId) {
        setSelectedFeedbackId(requestedFeedbackId);
      }
      return;
    }

    const hasCurrent = internalFeedbackItems.some((item) => item.id === selectedFeedbackId);
    if (!hasCurrent) {
      setSelectedFeedbackId(internalFeedbackItems[0].id);
    }
  }, [internalFeedbackItems, searchParams, selectedFeedbackId]);

  useEffect(() => {
    if (!selectedFeedbackId) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    if (nextParams.get('feedbackId') !== selectedFeedbackId) {
      nextParams.set('feedbackId', selectedFeedbackId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedFeedbackId, setSearchParams]);

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

  async function handleUpdateInternalFeedback(payload) {
    if (!selectedFeedbackId) return;
    await updateInternalFeedback.mutateAsync({
      feedbackId: selectedFeedbackId,
      payload,
    });
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

        {internalFeedbackQueueLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading internal feedback queue…</p>
        ) : internalFeedbackItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No low-rating feedback items are waiting right now.</p>
        ) : (
          <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {internalFeedbackItems.map((item) => {
                const selected = item.id === selectedFeedbackId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFeedbackId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
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
                      <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-slate-700">{item.summary || 'No customer note stored.'}</p>
                  </button>
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
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(selectedInternalFeedback.priority)}`}>
                          {selectedInternalFeedback.priority}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(selectedInternalFeedback.status)}`}>
                          {selectedInternalFeedback.status.replace(/_/g, ' ')}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {selectedInternalFeedback.rating ? `${selectedInternalFeedback.rating}/5` : 'No rating'}
                        </span>
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-slate-900">{selectedInternalFeedback.contactPhone || 'Unknown contact'}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Created {formatDate(selectedInternalFeedback.createdAt)}
                        {selectedInternalFeedback.assignee?.name ? ` • Owned by ${selectedInternalFeedback.assignee.name}` : ' • Unassigned'}
                      </p>
                    </div>
                    {selectedInternalFeedback.interactionEventId ? (
                      <Link
                        to={`${copy.notificationsPath}?interactionEventId=${encodeURIComponent(selectedInternalFeedback.interactionEventId)}`}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
                      >
                        Open Related Alerts
                      </Link>
                    ) : null}
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
                        <p>Responded: {formatDate(selectedInternalFeedback.session?.respondedAt || selectedInternalFeedback.session?.createdAt)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Structured Interaction</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>Event type: {selectedInternalFeedback.interactionEvent?.eventType || '—'}</p>
                        <p>Channel: {selectedInternalFeedback.interactionEvent?.channel || '—'}</p>
                        <p>{selectedInternalFeedback.interactionEvent?.summary || 'No linked interaction summary was stored.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback({ assignToSelf: true })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Take Ownership
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback({ status: 'in_progress' })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Start Triage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback({ status: 'resolved', resolutionNotes: resolutionDraft })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback({ status: 'dismissed', resolutionNotes: resolutionDraft })}
                        disabled={updateInternalFeedback.isPending}
                        className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInternalFeedback({ status: 'new' })}
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
                      onClick={() => handleUpdateInternalFeedback({ resolutionNotes: resolutionDraft })}
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
                              {item.channel?.toUpperCase() || 'Notification'} • {item.status || 'unknown'} • {formatDate(item.createdAt)}
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
                                {entry.updatedBy?.name || entry.updatedBy?.email || 'Operator'} • {formatDate(entry.createdAt)}
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
                  to={`${copy.reviewsPath}?reviewId=${encodeURIComponent(item.id)}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{item.platformLabel}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(item.aiSentiment === 'negative' ? 'needs_attention' : item.replyState === 'posted' ? 'connected' : 'detected')}`}>
                      {item.aiSentiment}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{item.replyState}</span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.reviewerName}</p>
                      <p className="mt-1 text-xs text-amber-600">{item.rating ? `${item.rating} stars` : 'No rating'}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
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
                          <span className="text-xs text-slate-500">{formatDate(item.respondedAt || item.createdAt)}</span>
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(['negative_review', 'feedback_low_rating'].includes(alert.eventType) ? 'needs_attention' : 'detected')}`}>
                        {String(alert.eventType || 'review_alert').replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(alert.createdAt)}</span>
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(integration.status)}`}>
                        {integration.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{integration.description}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      Synced reviews: {integration.syncedReviewCount || 0}
                      {integration.reviewLink ? ' • Invite link configured' : ' • No invite link yet'}
                      {integration.lastUpdatedAt ? ` • Updated ${formatDate(integration.lastUpdatedAt)}` : ''}
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
