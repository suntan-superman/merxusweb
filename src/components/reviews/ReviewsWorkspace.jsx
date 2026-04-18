import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SelectField from '../common/SelectField';
import AIResponsePanel from './AIResponsePanel';
import {
  useApproveReviewDraft,
  useGenerateReviewResponse,
  useReviewDetail,
  useReviewsWorkspace,
} from '../../hooks/useReviewQueries';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Reputation Reviews',
      subtitle: 'Monitor public reviews, draft responses, and spot reputation risk before it snowballs.',
      commandCenterPath: '/restaurant/command-center',
      billingPath: '/restaurant/billing',
      notificationsPath: '/restaurant/notifications',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      title: 'Reputation Reviews',
      subtitle: 'Watch public sentiment, draft thoughtful replies, and coordinate brand-sensitive follow-up across listing and lead activity.',
      commandCenterPath: '/estate/command-center',
      billingPath: '/estate/billing',
      notificationsPath: '/estate/notifications',
    };
  }

  return {
    title: 'Reputation Reviews',
    subtitle: 'Track reputation trends, moderate review drafts, and route sensitive customer moments into the right team workflow.',
    commandCenterPath: '/voice/command-center',
    billingPath: '/voice/billing',
    notificationsPath: '/voice/notifications',
  };
}

function formatDate(value) {
  if (!value) return 'Pending timestamp';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Pending timestamp';
  return parsed.toLocaleString();
}

function starsForRating(rating) {
  const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
  return '★★★★★'.slice(0, safeRating) + '☆☆☆☆☆'.slice(0, 5 - safeRating);
}

function sentimentClass(sentiment) {
  if (sentiment === 'negative') return 'bg-red-100 text-red-700';
  if (sentiment === 'positive') return 'bg-green-100 text-green-700';
  return 'bg-slate-100 text-slate-700';
}

function replyStateClass(replyState) {
  if (replyState === 'posted') return 'bg-green-100 text-green-700';
  if (replyState === 'approved') return 'bg-sky-100 text-sky-700';
  if (replyState === 'draft') return 'bg-amber-100 text-amber-700';
  if (replyState === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

function urgencyClass(urgency) {
  if (urgency === 'high') return 'text-red-600';
  if (urgency === 'medium') return 'text-amber-600';
  return 'text-slate-600';
}

function alertClass(eventType) {
  const normalized = String(eventType || '').toLowerCase();
  if (normalized === 'negative_review' || normalized === 'feedback_low_rating') return 'bg-red-100 text-red-700';
  if (normalized === 'review_spike') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default function ReviewsWorkspace({ tenantType }) {
  const copy = copyForTenant(tenantType);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    days: Number(searchParams.get('days') || 30),
    platform: searchParams.get('platform') || '',
    rating: searchParams.get('rating') || '',
    replyState: searchParams.get('replyState') || '',
    sentiment: searchParams.get('sentiment') || '',
    search: searchParams.get('search') || '',
  });
  const [selectedReviewId, setSelectedReviewId] = useState(searchParams.get('reviewId') || '');
  const [error, setError] = useState('');
  const {
    data: workspace,
    isLoading: loading,
    error: workspaceError,
  } = useReviewsWorkspace(filters);
  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useReviewDetail(selectedReviewId);
  const generateResponseMutation = useGenerateReviewResponse();
  const approveDraftMutation = useApproveReviewDraft();

  const summary = workspace?.summary || {};
  const items = workspace?.items || [];
  const selectedReview = detail?.review || null;
  const availablePlatforms = useMemo(
    () => (workspace?.availablePlatforms || []).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
    [workspace?.availablePlatforms]
  );

  useEffect(() => {
    const message =
      workspaceError?.response?.data?.error ||
      detailError?.response?.data?.error ||
      '';
    setError(message || '');
  }, [detailError, workspaceError]);

  useEffect(() => {
    const nextItems = workspace?.items || [];
    const requestedReviewId = searchParams.get('reviewId') || '';
    setSelectedReviewId((current) => {
      if (requestedReviewId && nextItems.some((item) => item.id === requestedReviewId)) {
        return requestedReviewId;
      }
      if (current && nextItems.some((item) => item.id === current)) {
        return current;
      }
      return nextItems[0]?.id || '';
    });
  }, [searchParams, workspace]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    const syncField = (key, value) => {
      if (value === '' || value === null || value === undefined) nextParams.delete(key);
      else nextParams.set(key, String(value));
    };

    syncField('days', filters.days === 30 ? '' : filters.days);
    syncField('platform', filters.platform);
    syncField('rating', filters.rating);
    syncField('replyState', filters.replyState);
    syncField('sentiment', filters.sentiment);
    syncField('search', filters.search);
    syncField('reviewId', selectedReviewId);

    const currentString = searchParams.toString();
    const nextString = nextParams.toString();
    if (currentString !== nextString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, searchParams, selectedReviewId, setSearchParams]);

  async function handleGenerateResponse() {
    if (!selectedReviewId) return;
    setError('');
    try {
      await generateResponseMutation.mutateAsync(selectedReviewId);
    } catch (mutationError) {
      setError(mutationError?.response?.data?.error || 'Failed to generate review response.');
    }
  }

  async function handleApproveDraft() {
    const latestDraft = detail?.drafts?.[0];
    if (!selectedReviewId || !latestDraft?.id || latestDraft?.status !== 'draft') return;

    setError('');
    try {
      await approveDraftMutation.mutateAsync({
        reviewId: selectedReviewId,
        draftId: latestDraft.id,
      });
    } catch (mutationError) {
      setError(mutationError?.response?.data?.error || 'Failed to approve review draft.');
    }
  }

  return (
    <section className="space-y-6">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">Elite Reputation</p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{copy.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={copy.commandCenterPath}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Command Center
              </Link>
              <Link
                to={copy.notificationsPath}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Notifications
              </Link>
              <Link
                to={copy.billingPath}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Billing
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.metrics?.averageRating ?? '—'}</p>
            <p className="mt-2 text-xs text-slate-500">Across filtered public reviews</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Response Rate</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.metrics?.responseRate ?? 0}%</p>
            <p className="mt-2 text-xs text-slate-500">Reviews with posted replies</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Reply</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.totals?.pendingReply ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Reviews still needing response handling</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Median Reply Time</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.metrics?.medianReplyHours ?? '—'}</p>
            <p className="mt-2 text-xs text-slate-500">Hours from review to posted reply</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Platforms</h3>
          <div className="mt-4 space-y-3">
            {(summary?.platformBreakdown || []).length === 0 ? (
              <p className="text-sm text-gray-500">No connected review platforms yet.</p>
            ) : (
              summary.platformBreakdown.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Sentiment</h3>
          <div className="mt-4 space-y-3">
            {(summary?.sentimentBreakdown || []).length === 0 ? (
              <p className="text-sm text-gray-500">Sentiment will appear once reviews are ingested.</p>
            ) : (
              summary.sentimentBreakdown.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sentimentClass(item.key)}`}>{item.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Issue Clusters</h3>
          <div className="mt-4 space-y-3">
            {(summary?.issueClusters || []).length === 0 ? (
              <p className="text-sm text-gray-500">Topic clustering will populate as AI topics are stored on reviews.</p>
            ) : (
              summary.issueClusters.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium capitalize text-gray-900">{item.label}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
        <div className="card">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <SelectField
              label="Window"
              value={filters.days}
              onChange={(value) => setFilters((current) => ({ ...current, days: Number(value || 30) }))}
              options={[
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
                { value: 90, label: '90 days' },
              ]}
            />
            <SelectField
              label="Platform"
              value={filters.platform}
              onChange={(value) => setFilters((current) => ({ ...current, platform: value }))}
              options={availablePlatforms}
              placeholder="All platforms"
            />
            <SelectField
              label="Rating"
              value={filters.rating}
              onChange={(value) => setFilters((current) => ({ ...current, rating: value }))}
              options={[
                { value: '5', label: '5 stars' },
                { value: '4', label: '4 stars' },
                { value: '3', label: '3 stars' },
                { value: '2', label: '2 stars' },
                { value: '1', label: '1 star' },
              ]}
              placeholder="All ratings"
            />
            <SelectField
              label="Reply State"
              value={filters.replyState}
              onChange={(value) => setFilters((current) => ({ ...current, replyState: value }))}
              options={[
                { value: 'none', label: 'Needs reply' },
                { value: 'draft', label: 'Draft ready' },
                { value: 'approved', label: 'Approved' },
                { value: 'posted', label: 'Posted' },
                { value: 'failed', label: 'Failed' },
              ]}
              placeholder="All states"
            />
            <SelectField
              label="Sentiment"
              value={filters.sentiment}
              onChange={(value) => setFilters((current) => ({ ...current, sentiment: value }))}
              options={[
                { value: 'positive', label: 'Positive' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'negative', label: 'Negative' },
              ]}
              placeholder="All sentiment"
            />
            <label className="block text-sm font-medium text-gray-700">
              Search
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search reviewer, text, topic, or location"
                className="input-field mt-2"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Review Feed</h3>
            <span className="text-sm text-gray-500">{workspace?.total ?? 0} results</span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading reviews…</p>
          ) : items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-900">No reviews found for the current filters</p>
              <p className="mt-2 text-sm text-slate-600">
                This usually means review platforms have not been connected yet or no reviews have been synced into Merxus.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {items.map((item) => {
                const selected = item.id === selectedReviewId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedReviewId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.platformLabel}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${replyStateClass(item.replyState)}`}>{item.replyState}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sentimentClass(item.aiSentiment)}`}>{item.aiSentiment}</span>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.reviewerName}</p>
                        <p className="mt-1 text-xs text-amber-600">{starsForRating(item.rating)}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-slate-700">{item.reviewText || 'No review text available.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{item.businessLocationLabel}</span>
                      {item.draftCount ? <span>{item.draftCount} draft{item.draftCount === 1 ? '' : 's'}</span> : null}
                      {item.aiTopics?.length ? <span>{item.aiTopics.slice(0, 2).join(' • ')}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Review Detail</h3>
          {detailLoading ? (
            <p className="mt-4 text-sm text-gray-500">Loading review detail…</p>
          ) : !selectedReview ? (
            <p className="mt-4 text-sm text-gray-500">Select a review to inspect reputation signals, linked interactions, and draft history.</p>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{selectedReview.platformLabel}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${replyStateClass(selectedReview.replyState)}`}>{selectedReview.replyState}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sentimentClass(selectedReview.aiSentiment)}`}>{selectedReview.aiSentiment}</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-lg font-semibold text-slate-900">{selectedReview.reviewerName}</p>
                  <p className="text-sm text-amber-600">{starsForRating(selectedReview.rating)}</p>
                  <p className="text-sm text-slate-500">
                    {selectedReview.businessLocationLabel} • {formatDate(selectedReview.createdAt)}
                  </p>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {selectedReview.reviewText || 'No review body was stored for this record.'}
                </p>
                {selectedReview.reviewUrl ? (
                  <a href={selectedReview.reviewUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                    Open original review
                  </a>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Summary</p>
                  <p className="mt-3 text-sm text-slate-700">
                    {selectedReview.aiSummary || 'No AI summary has been stored for this review yet.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Signals</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>Sentiment: <span className="font-medium capitalize">{selectedReview.aiSentiment}</span></p>
                    <p>Urgency: <span className={`font-medium capitalize ${urgencyClass(selectedReview.aiUrgency)}`}>{selectedReview.aiUrgency}</span></p>
                    <p>Assignee: <span className="font-medium">{selectedReview.assigneeLabel || 'Unassigned'}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topics</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedReview.aiTopics?.length ? (
                    selectedReview.aiTopics.map((topic) => (
                      <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {topic}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No AI topics stored yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft Reply History</p>
                <div className="mt-3 space-y-3">
                  {(detail?.drafts || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No reply drafts have been stored for this review yet.</p>
                  ) : (
                    detail.drafts.map((draft) => (
                      <div key={draft.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${replyStateClass(draft.status)}`}>{draft.status}</span>
                          <span className="text-xs text-slate-500">{draft.createdBy === 'ai' ? 'AI draft' : 'User draft'}</span>
                          {draft.confidence !== null ? <span className="text-xs text-slate-500">Confidence {Math.round(draft.confidence * 100)}%</span> : null}
                          {draft.approvedAt ? <span className="text-xs text-slate-500">Approved {formatDate(draft.approvedAt)}</span> : null}
                          {draft.postedAt ? <span className="text-xs text-slate-500">Posted {formatDate(draft.postedAt)}</span> : null}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{draft.body || 'No draft body stored.'}</p>
                        {draft.moderationWarnings?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {draft.moderationWarnings.map((warning) => (
                              <span key={warning} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                {warning}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <AIResponsePanel
                review={selectedReview}
                drafts={detail?.drafts || []}
                onGenerate={handleGenerateResponse}
                onApprove={handleApproveDraft}
                generating={generateResponseMutation.isPending}
                approving={approveDraftMutation.isPending}
              />

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Interactions</p>
                <div className="mt-3 space-y-3">
                  {(detail?.relatedInteractions || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No linked Merxus interaction events are stored for this review yet.</p>
                  ) : (
                    detail.relatedInteractions.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.eventType}</span>
                          <span className="text-xs text-slate-500">{item.channel}</span>
                          {item.reviewStatus ? (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sentimentClass(item.reviewStatus === 'approved' ? 'positive' : 'neutral')}`}>
                              {item.reviewStatus}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900">{item.customerName}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.summary || 'No interaction summary stored.'}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                        <Link
                          to={`${copy.notificationsPath}?interactionEventId=${encodeURIComponent(item.id)}`}
                          className="mt-3 inline-flex text-xs font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Open in Notifications
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Alerts</p>
                <div className="mt-3 space-y-3">
                  {(detail?.relatedNotifications || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No review alert events have been linked to this record yet.</p>
                  ) : (
                    detail.relatedNotifications.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alertClass(item.eventType)}`}>
                            {String(item.eventType || 'alert').replace(/_/g, ' ')}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${replyStateClass(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-xs text-slate-500">{item.channel}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {item.reviewerName || selectedReview.reviewerName || 'Review alert'}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{item.body || 'No alert summary stored.'}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                        <Link
                          to={`${copy.notificationsPath}?eventId=${encodeURIComponent(item.id)}`}
                          className="mt-3 inline-flex text-xs font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Open Alert Detail
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
