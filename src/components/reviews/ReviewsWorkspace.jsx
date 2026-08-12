import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import SelectField from '../common/SelectField';
import AIResponsePanel from './AIResponsePanel';
import { useAuth } from '../../context/AuthContext';
import { downloadCsvFile } from '../../utils/csv';
import {
  buildPostingProviderOptions,
  buildReviewQueueViews,
  buildReviewWorkspaceExportRows,
  isReviewOwnedByCurrentUser,
  labelize,
  normalizeReviewWorkspaceView,
  reviewMatchesWorkspaceView,
} from '../../utils/reviewWorkspace';
import {
  useApproveReviewDraft,
  useGenerateReviewResponse,
  useReviewDetail,
  useReviewsWorkspace,
  useUpdateReviewDetail,
} from '../../hooks/useReviewQueries';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Reputation Reviews',
      subtitle: 'Monitor public reviews, draft responses, and spot reputation risk before it snowballs.',
      commandCenterPath: '/restaurant/command-center',
      billingPath: '/restaurant/billing',
      feedbackPath: '/restaurant/feedback',
      notificationsPath: '/restaurant/notifications',
      setupPath: '/restaurant/feedback/setup',
      integrationsPath: '/restaurant/feedback/integrations',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      title: 'Reputation Reviews',
      subtitle: 'Watch public sentiment, draft thoughtful replies, and coordinate brand-sensitive follow-up across listing and lead activity.',
      commandCenterPath: '/estate/command-center',
      billingPath: '/estate/billing',
      feedbackPath: '/estate/feedback',
      notificationsPath: '/estate/notifications',
      setupPath: '/estate/feedback/setup',
      integrationsPath: '/estate/feedback/integrations',
    };
  }

  return {
    title: 'Reputation Reviews',
    subtitle: 'Track reputation trends, moderate review drafts, and route sensitive customer moments into the right team workflow.',
    commandCenterPath: '/voice/command-center',
    billingPath: '/voice/billing',
    feedbackPath: '/voice/feedback',
    notificationsPath: '/voice/notifications',
    setupPath: '/voice/feedback/setup',
    integrationsPath: '/voice/feedback/integrations',
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

function workflowStageClass(stage) {
  if (stage === 'completed') return 'bg-green-100 text-green-700';
  if (stage === 'awaiting_post') return 'bg-sky-100 text-sky-700';
  if (stage === 'awaiting_approval') return 'bg-amber-100 text-amber-700';
  if (stage === 'retry_needed') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

function alertClass(eventType) {
  const normalized = String(eventType || '').toLowerCase();
  if (normalized === 'negative_review' || normalized === 'feedback_low_rating') return 'bg-red-100 text-red-700';
  if (normalized === 'review_spike') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function previewText(value, fallback = '') {
  const safeValue = String(value || '').trim();
  return safeValue || fallback;
}

export default function ReviewsWorkspace({ tenantType }) {
  const copy = copyForTenant(tenantType);
  const { user, userClaims } = useAuth();
  const role = String(userClaims?.role || 'staff').toLowerCase();
  const canManageIntegrations = role === 'owner' || role === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    days: Number(searchParams.get('days') || 30),
    platform: searchParams.get('platform') || '',
    rating: searchParams.get('rating') || '',
    replyState: searchParams.get('replyState') || '',
    sentiment: searchParams.get('sentiment') || '',
    search: searchParams.get('search') || '',
  });
  const [activeView, setActiveView] = useState(normalizeReviewWorkspaceView(searchParams.get('view')));
  const [selectedReviewId, setSelectedReviewId] = useState(searchParams.get('reviewId') || '');
  const [error, setError] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [postingMode, setPostingMode] = useState('manual');
  const [postedVia, setPostedVia] = useState('');
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
  const updateReviewDetailMutation = useUpdateReviewDetail();

  const summary = workspace?.summary || {};
  const items = workspace?.items || [];
  const queueSummary = summary?.queue || {};
  const selectedReview = detail?.review || null;
  const availablePlatforms = useMemo(
    () => (workspace?.availablePlatforms || []).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
    [workspace?.availablePlatforms]
  );
  const postingModeOptions = useMemo(
    () => [{ value: 'manual', label: 'Manual Provider Post' }],
    []
  );
  const postingProviderOptions = useMemo(
    () =>
      buildPostingProviderOptions({
        selectedPlatform: selectedReview?.platform,
        postedVia: detail?.review?.replyPostedVia,
        availablePlatforms: workspace?.availablePlatforms || [],
      }),
    [detail?.review?.replyPostedVia, selectedReview?.platform, workspace?.availablePlatforms]
  );
  const visibleItems = useMemo(
    () => items.filter((item) => reviewMatchesWorkspaceView(item, activeView, user)),
    [activeView, items, user]
  );
  const queueViews = useMemo(
    () => buildReviewQueueViews(items, queueSummary, user),
    [items, queueSummary, user]
  );

  useEffect(() => {
    const message =
      workspaceError?.response?.data?.error ||
      detailError?.response?.data?.error ||
      '';
    setError(message || '');
  }, [detailError, workspaceError]);

  useEffect(() => {
    setModerationNotes(detail?.review?.operatorNotes || '');
    setFailureReason(detail?.review?.replyFailureReason || '');
    setPostingMode('manual');
    setPostedVia(detail?.review?.replyPostedVia || detail?.review?.platform || '');
  }, [
    detail?.postingKit?.workflowMode,
    detail?.review?.id,
    detail?.review?.operatorNotes,
    detail?.review?.platform,
    detail?.review?.replyFailureReason,
    detail?.review?.replyPostedVia,
    detail?.review?.replyPostingMode,
  ]);

  useEffect(() => {
    const requestedView = normalizeReviewWorkspaceView(searchParams.get('view'));
    setActiveView((current) => (current === requestedView ? current : requestedView));
  }, [searchParams]);

  useEffect(() => {
    const nextItems = workspace?.items || [];
    const nextVisibleItems = nextItems.filter((item) => reviewMatchesWorkspaceView(item, activeView, user));
    const requestedReviewId = searchParams.get('reviewId') || '';
    setSelectedReviewId((current) => {
      if (requestedReviewId && nextVisibleItems.some((item) => item.id === requestedReviewId)) {
        return requestedReviewId;
      }
      if (current && nextVisibleItems.some((item) => item.id === current)) {
        return current;
      }
      return nextVisibleItems[0]?.id || '';
    });
  }, [activeView, searchParams, user, workspace]);

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
    syncField('view', activeView === 'all' ? '' : activeView);
    syncField('reviewId', selectedReviewId);

    const currentString = searchParams.toString();
    const nextString = nextParams.toString();
    if (currentString !== nextString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeView, filters, searchParams, selectedReviewId, setSearchParams]);

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

  async function handleUpdateReview(reviewId, payload, { select = false } = {}) {
    if (!reviewId) return;
    setError('');
    try {
      if (select) {
        setSelectedReviewId(reviewId);
      }
      await updateReviewDetailMutation.mutateAsync({
        reviewId,
        payload,
      });
    } catch (mutationError) {
      setError(mutationError?.response?.data?.error || 'Failed to update review workflow.');
    }
  }

  function buildModerationPayload(overrides = {}) {
    return {
      operatorNotes: moderationNotes,
      postingMode,
      postedVia: postedVia || selectedReview?.platform || '',
      ...overrides,
    };
  }

  function handleCardAction(event, reviewId, payload, options = {}) {
    event.stopPropagation();
    event.preventDefault();
    handleUpdateReview(reviewId, payload, options);
  }

  async function handleCopyDraft(body = '') {
    const text = String(body || '').trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Approved draft copied to clipboard.');
    } catch (_) {
      toast.error('Unable to copy the draft right now.');
    }
  }

  function handleExportReviews() {
    const rows = buildReviewWorkspaceExportRows(visibleItems);
    if (!rows.length) return;
    downloadCsvFile(`merxus-${tenantType}-reviews-workspace.csv`, rows);
  }

  async function handleCopyText(text = '', successMessage = 'Copied to clipboard.') {
    const safeText = String(text || '').trim();
    if (!safeText) return;

    try {
      await navigator.clipboard.writeText(safeText);
      toast.success(successMessage);
    } catch (_) {
      toast.error('Unable to copy right now.');
    }
  }

  return (
    <section className="space-y-6" data-testid="review-workspace">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">Elite Reputation</p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{copy.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {canManageIntegrations ? (
                <Link
                  to={copy.setupPath}
                  data-testid="connect-review-platforms-link"
                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                  Connect Review Platforms
                </Link>
              ) : null}
              <Link
                to={copy.integrationsPath}
                data-testid="manage-review-integrations-link"
                className="rounded-full border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Manage Integrations
              </Link>
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
                to={copy.feedbackPath}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Feedback Command
              </Link>
              <Link
                to={copy.billingPath}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Billing
              </Link>
              <button
                type="button"
                onClick={handleExportReviews}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Export Filtered CSV
              </button>
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
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">No connected review platforms yet.</p>
                <p className="mt-2 text-sm text-slate-600">
                  {canManageIntegrations
                    ? 'Use the guided setup to connect Google first, select locations, validate access, and run the initial import.'
                    : 'An owner or manager can connect Google and other supported review sources.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canManageIntegrations ? (
                    <Link
                      to={copy.setupPath}
                      data-testid="start-review-setup-link"
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Start Guided Setup
                    </Link>
                  ) : null}
                  <Link
                    to={copy.integrationsPath}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Open Integrations
                  </Link>
                </div>
              </div>
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

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Health</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved Awaiting Post</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.workflow?.approvedAwaitingPost ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failed Publishing</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.workflow?.failedPublishing ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Median Approval Time</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.metrics?.medianApprovalHours ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Attempts / Actionable</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.workflow?.averageAttemptsPerActionable ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Reply States</h3>
          <div className="mt-4 space-y-3">
            {(summary?.replyStateBreakdown || []).length === 0 ? (
              <p className="text-sm text-gray-500">Reply state distribution will populate once review activity is available.</p>
            ) : (
              summary.replyStateBreakdown.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${replyStateClass(item.key)}`}>{item.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900">Locations</h3>
          <div className="mt-4 space-y-3">
            {(summary?.locationScores || []).length === 0 ? (
              <p className="text-sm text-gray-500">Location-level review performance will appear once review records have location labels.</p>
            ) : (
              summary.locationScores.slice(0, 5).map((item) => (
                <div key={item.id || item.label} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.reviewCount}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Avg rating {item.averageRating ?? '—'} • Response rate {item.responseRate ?? 0}%
                  </p>
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

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue Focus</p>
                <p className="mt-1 text-sm text-slate-600">Switch the feed between response states, risk buckets, and ownership views.</p>
              </div>
              {activeView !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setActiveView('all')}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear focus
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {queueViews.map((view) => {
                const selected = activeView === view.key;
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setActiveView(view.key)}
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

          <div className="mt-6 flex items-center justify-between gap-3" data-testid="review-feed-heading">
            <h3 className="text-lg font-semibold text-gray-900">Review Feed</h3>
            <span className="text-sm text-gray-500">
              {visibleItems.length} shown{activeView !== 'all' ? ` • ${items.length} filtered` : ` • ${workspace?.total ?? 0} results`}
            </span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading reviews…</p>
          ) : items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-900">No reviews found for the current filters</p>
              <p className="mt-2 text-sm text-slate-600">
                This usually means review platforms have not been connected yet or no reviews have been synced into Merxus.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {canManageIntegrations ? (
                  <Link
                    to={copy.setupPath}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Connect Review Platforms
                  </Link>
                ) : null}
                <Link
                  to={copy.integrationsPath}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  View Integration Status
                </Link>
              </div>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-900">No reviews match this queue focus</p>
              <p className="mt-2 text-sm text-slate-600">
                Try switching the queue focus or clearing a filter to bring more reviews back into the feed.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {visibleItems.map((item) => {
                const selected = item.id === selectedReviewId;
                const canTakeOwnership = !isReviewOwnedByCurrentUser(item, user);
                const canMarkPosted = item.replyState === 'approved' && item.latestDraft?.id;
                return (
                  <div
                    key={item.id}
                    data-testid="review-feed-item"
                    data-review-id={item.id}
                    data-review-platform={item.platform}
                    data-review-rating={item.rating ?? ''}
                    data-review-sentiment={item.aiSentiment || ''}
                    onClick={() => setSelectedReviewId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedReviewId(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
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
                      {item.assigneeLabel ? <span>Owner: {item.assigneeLabel}</span> : <span>Unassigned</span>}
                      {item.latestDraft?.status ? <span>Latest draft: {item.latestDraft.status}</span> : null}
                      {item.replyAttemptCount ? <span>{item.replyAttemptCount} attempt{item.replyAttemptCount === 1 ? '' : 's'}</span> : null}
                      {item.aiTopics?.length ? <span>{item.aiTopics.slice(0, 2).join(' • ')}</span> : null}
                    </div>
                    {item.workflowGuidance?.statusLabel ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <span className={`mr-2 rounded-full px-2 py-1 font-semibold ${workflowStageClass(item.workflowGuidance.stage)}`}>
                          {item.workflowGuidance.statusLabel}
                        </span>
                        {item.workflowGuidance.recommendedAction}
                      </div>
                    ) : null}
                    {item.operatorNotes ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Notes:</span> {previewText(item.operatorNotes)}
                      </div>
                    ) : null}
                    {item.replyFailureReason ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span className="font-semibold">Failure:</span> {previewText(item.replyFailureReason)}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canTakeOwnership ? (
                        <button
                          type="button"
                          onClick={(event) => handleCardAction(event, item.id, { assignToSelf: true }, { select: true })}
                          disabled={updateReviewDetailMutation.isPending}
                          className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Take Ownership
                        </button>
                      ) : null}
                      {item.assigneeLabel ? (
                        <button
                          type="button"
                          onClick={(event) => handleCardAction(event, item.id, { clearAssignment: true }, { select: true })}
                          disabled={updateReviewDetailMutation.isPending}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Clear Owner
                        </button>
                      ) : null}
                      {canMarkPosted ? (
                        <button
                          type="button"
                          onClick={(event) => handleCardAction(event, item.id, { replyState: 'posted', draftId: item.latestDraft.id }, { select: true })}
                          disabled={updateReviewDetailMutation.isPending}
                          className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Report Posted
                        </button>
                      ) : null}
                      {['failed', 'approved'].includes(String(item.replyState || '').toLowerCase()) ? (
                        <button
                          type="button"
                          onClick={(event) => handleCardAction(event, item.id, { replyState: 'none' }, { select: true })}
                          disabled={updateReviewDetailMutation.isPending}
                          className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reopen
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" data-testid="review-detail-panel">
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
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Guidance</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedReview.workflowGuidance?.recommendedAction || 'Move this review through draft, approval, and posting.'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {selectedReview.workflowGuidance?.operatorHint || 'Capture owner handoff and posting diagnostics here.'}
                    </p>
                  </div>
                  {detail?.drafts?.[0]?.body ? (
                    <button
                      type="button"
                      onClick={() => handleCopyDraft(detail.drafts[0].body)}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Copy Latest Draft
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Stage</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedReview.workflowGuidance?.statusLabel || 'Needs Response'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved At</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(selectedReview.replyApprovedAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posted At</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(selectedReview.replyPostedAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply Attempts</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedReview.replyAttemptCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operator Posting Kit</p>
                    <p className="mt-2 text-sm text-slate-700">
                      Manual posting support for the existing operator-assisted workflow, including the best available reply copy and a handoff summary you can pass between teammates.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail?.postingKit?.responseBody ? (
                      <button
                        type="button"
                        onClick={() => handleCopyText(detail.postingKit.responseBody, 'Posting response copied to clipboard.')}
                        className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        Copy Posting Reply
                      </button>
                    ) : null}
                    {detail?.postingKit?.handoffSummary ? (
                      <button
                        type="button"
                        onClick={() => handleCopyText(detail.postingKit.handoffSummary, 'Posting handoff summary copied to clipboard.')}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Copy Handoff Summary
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Mode</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{detail?.postingKit?.workflowMode || 'manual'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source Draft</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{detail?.postingKit?.sourceDraftStatus || 'none'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready To Post</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{detail?.postingKit?.readyToPost ? 'Yes' : 'Not Yet'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Failure</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{detail?.postingKit?.latestFailureReason || 'None'}</p>
                  </div>
                </div>

                {detail?.postingKit?.handoffSummary ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Handoff Summary</p>
                    <p className="mt-2 text-sm text-slate-700">{detail.postingKit.handoffSummary}</p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply Ready For Posting</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                      {detail?.postingKit?.responseBody || 'No approved reply copy is ready yet. Generate or approve a draft first.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist</p>
                    <div className="mt-3 space-y-2">
                      {(detail?.postingKit?.checklist || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No posting checklist is available yet.</p>
                      ) : (
                        detail.postingKit.checklist.map((item) => (
                          <div key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                            {item}
                          </div>
                        ))
                      )}
                    </div>
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
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Moderation Workflow</p>
                    <p className="mt-2 text-sm text-slate-700">
                      Assign ownership, capture operator notes, and move the review to its final reply state without leaving the detail pane.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateReview(selectedReviewId, buildModerationPayload({ assignToSelf: true }))}
                      disabled={updateReviewDetailMutation.isPending}
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Take Ownership
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReview(selectedReviewId, buildModerationPayload({ clearAssignment: true }))}
                      disabled={updateReviewDetailMutation.isPending || !selectedReview.assigneeLabel}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReview(selectedReviewId, buildModerationPayload())}
                      disabled={updateReviewDetailMutation.isPending}
                      className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save Workflow
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateReview(
                          selectedReviewId,
                          buildModerationPayload({
                            replyState: 'posted',
                            draftId: detail?.drafts?.[0]?.id || '',
                          })
                        )
                      }
                      disabled={updateReviewDetailMutation.isPending || detail?.drafts?.[0]?.status !== 'approved'}
                      className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Report Posted Manually
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateReview(
                          selectedReviewId,
                          buildModerationPayload({
                            replyState: 'failed',
                            failureReason,
                            draftId: detail?.drafts?.[0]?.id || '',
                          })
                        )
                      }
                      disabled={updateReviewDetailMutation.isPending}
                      className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Failed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReview(selectedReviewId, buildModerationPayload({ replyState: 'none' }))}
                      disabled={updateReviewDetailMutation.isPending}
                      className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reopen
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Posting mode"
                    value={postingMode}
                    onChange={(value) => setPostingMode(value || 'manual')}
                    options={postingModeOptions}
                    helperText="Provider posting is manual in the current rollout. A later sync will verify whether the public reply exists."
                  />
                  <SelectField
                    label="Posting provider"
                    value={postedVia}
                    onChange={(value) => setPostedVia(value || '')}
                    options={postingProviderOptions}
                    placeholder="Select provider"
                    helperText="Record the platform or provider the operator is using for this review handoff."
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Operator notes
                    <textarea
                      rows="4"
                      value={moderationNotes}
                      onChange={(event) => setModerationNotes(event.target.value)}
                      className="input-field mt-2"
                      placeholder="Capture follow-up context, owner handoff, or posting notes."
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Failure reason
                    <textarea
                      rows="4"
                      value={failureReason}
                      onChange={(event) => setFailureReason(event.target.value)}
                      className="input-field mt-2"
                      placeholder="Optional reason if reply posting failed or needs escalation."
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{selectedReview.assigneeLabel || 'Unassigned'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply State</p>
                    <p className="mt-2 text-sm font-medium capitalize text-slate-900">
                      {selectedReview.replyState === 'posted' && selectedReview.replyVerification !== 'provider_verified'
                        ? 'Reported posted'
                        : selectedReview.replyState || 'none'}
                    </p>
                    {selectedReview.replyState === 'posted' ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedReview.replyVerification === 'provider_verified'
                          ? 'Verified by provider sync'
                          : 'Awaiting provider verification'}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posting Route</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {labelize(postedVia || selectedReview.replyPostedVia || selectedReview.platform || 'manual')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{labelize(postingMode || selectedReview.replyPostingMode || 'manual')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failure Reason</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{selectedReview.replyFailureReason || 'None'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply Attempt Log</p>
                <div className="mt-3 space-y-3">
                  {(selectedReview.replyAttempts || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No reply post attempts have been recorded yet.</p>
                  ) : (
                    [...selectedReview.replyAttempts].slice(-6).reverse().map((attempt, index) => (
                      <div key={`${attempt.createdAt || 'attempt'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${replyStateClass(attempt.outcome)}`}>
                            {attempt.outcome}
                          </span>
                          <span className="text-xs text-slate-500">{formatDate(attempt.createdAt)}</span>
                          {attempt.actor?.name || attempt.actor?.email ? (
                            <span className="text-xs text-slate-500">{attempt.actor?.name || attempt.actor?.email}</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          {attempt.failureReason || attempt.operatorNotes || 'Manual posting workflow update recorded.'}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Mode: {attempt.postingMode || 'manual'}{attempt.postedVia ? ` • Posted via ${attempt.postedVia}` : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review History</p>
                <div className="mt-3 space-y-3">
                  {(selectedReview.history || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No moderation updates have been saved yet.</p>
                  ) : (
                    [...selectedReview.history].slice(-6).reverse().map((entry, index) => (
                      <div key={`${entry.createdAt || 'history'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${replyStateClass(entry.replyState)}`}>
                            {entry.replyState}
                          </span>
                          <span className="text-xs text-slate-500">
                            {entry.updatedBy?.name || entry.updatedBy?.email || 'Operator'}
                          </span>
                          <span className="text-xs text-slate-500">{formatDate(entry.createdAt)}</span>
                        </div>
                        {entry.assignee?.name || entry.assignee?.email ? (
                          <p className="mt-2 text-sm text-slate-700">
                            Owner: {entry.assignee?.name || entry.assignee?.email}
                          </p>
                        ) : null}
                        {entry.operatorNotes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{entry.operatorNotes}</p>
                        ) : null}
                        {entry.failureReason ? (
                          <p className="mt-2 text-sm text-red-700">Failure: {entry.failureReason}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

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
