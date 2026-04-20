import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  disconnectReviewIntegrationOAuth,
  startReviewIntegrationOAuth,
  syncReviewIntegration,
  validateReviewIntegrationOAuth,
} from '../../api/reviews';
import {
  useCreateTestReview,
  useFeedbackSettings,
  useUpdateFeedbackSettings,
  useUpdateReviewIntegration,
} from '../../hooks/useReviewQueries';
import {
  buildFeedbackFocusNotice,
  buildFeedbackRemediationHighlights,
  buildValidationFallback,
  labelize,
  platformDisplayName,
  sortFeedbackIntegrations,
} from '../../utils/feedbackIntegrationsRouting';
import {
  formatFeedbackIntegrationDate,
  getFeedbackIntegrationHealthTone,
  getFeedbackIntegrationIssueTone,
  getFeedbackIntegrationRemediationTone,
  getFeedbackIntegrationStatusTone,
  getFeedbackIntegrationValidationTone,
  labelFeedbackHistoryAction,
} from '../../utils/feedbackIntegrationsPresentation';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Feedback Integrations',
      subtitle: 'Manage review source readiness and the SMS feedback funnel for your restaurant reputation workflows.',
      feedbackPath: '/restaurant/feedback',
      reviewsPath: '/restaurant/reviews',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      title: 'Feedback Integrations',
      subtitle: 'Manage review source readiness and the SMS feedback funnel for your real estate reputation workflows.',
      feedbackPath: '/estate/feedback',
      reviewsPath: '/estate/reviews',
    };
  }

  return {
    title: 'Feedback Integrations',
    subtitle: 'Manage review source readiness and the SMS feedback funnel for your office reputation workflows.',
    feedbackPath: '/voice/feedback',
    reviewsPath: '/voice/reviews',
  };
}

function defaultFunnelForm(funnel = {}) {
  return {
    enabled: Boolean(funnel.enabled),
    triggerOnPostCall: funnel.triggerOnPostCall !== false,
    triggerOnInboundSms: Boolean(funnel.triggerOnInboundSms),
    lowRatingThreshold: Number(funnel.lowRatingThreshold || 3),
    requestWindowHours: Number(funnel.requestWindowHours || 72),
    requestTemplate: funnel.requestTemplate || '',
    positiveReplyTemplate: funnel.positiveReplyTemplate || '',
    negativeReplyTemplate: funnel.negativeReplyTemplate || '',
    reviewInvitePlatforms: Array.isArray(funnel.reviewInvitePlatforms) ? funnel.reviewInvitePlatforms : ['google', 'facebook', 'trustpilot'],
  };
}

function toLocalDateTimeInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultTestReviewForm() {
  return {
    source: 'google',
    rating: 2,
    author: 'Test User',
    businessLocationLabel: 'Primary location',
    text: 'Service was slow and no one called me back.',
    timestamp: toLocalDateTimeInputValue(new Date()),
    createAlerts: true,
  };
}

function TrendStrip({ title, items = [], metricKey, colorClass = 'bg-emerald-500' }) {
  const maxValue = Math.max(...items.map((item) => Number(item?.[metricKey] || 0)), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? (
        <div className="mt-3 flex items-end gap-2">
          {items.map((item) => {
            const value = Number(item?.[metricKey] || 0);
            const height = maxValue > 0 ? Math.max(12, Math.round((value / maxValue) * 72)) : 12;
            return (
              <div key={`${metricKey}-${item.date}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end rounded-xl bg-slate-100 p-1">
                  <div className={`w-full rounded-lg ${colorClass}`} style={{ height }} />
                </div>
                <span className="text-xs font-semibold text-slate-700">{value}</span>
                <span className="text-[11px] text-slate-500">{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No recent trend data available yet.</p>
      )}
    </div>
  );
}

export default function FeedbackIntegrationsWorkspace({ tenantType }) {
  const copy = copyForTenant(tenantType);
  const { userClaims } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error, refetch } = useFeedbackSettings();
  const createTestReview = useCreateTestReview();
  const updateIntegration = useUpdateReviewIntegration();
  const updateFeedbackSettings = useUpdateFeedbackSettings();
  const [draftLabels, setDraftLabels] = useState({});
  const [draftModes, setDraftModes] = useState({});
  const [draftReviewLinks, setDraftReviewLinks] = useState({});
  const [funnelForm, setFunnelForm] = useState(defaultFunnelForm());
  const [activeIntegrationKey, setActiveIntegrationKey] = useState('');
  const [actionBusyKey, setActionBusyKey] = useState('');
  const [validationByPlatform, setValidationByPlatform] = useState({});
  const [testReviewForm, setTestReviewForm] = useState(defaultTestReviewForm());

  const integrations = data?.integrations || [];
  const stats = data?.stats || {};
  const syncAnalytics = data?.syncRunAnalytics || null;
  const analytics = data?.analytics || null;
  const focusedPlatform = String(searchParams.get('platform') || '').trim().toLowerCase();
  const remediationFocus = String(searchParams.get('focus') || '').trim().toLowerCase();
  const role = String(userClaims?.role || 'staff').toLowerCase();
  const canManage = role === 'owner' || role === 'manager';
  const integrationSummary = useMemo(() => ({
    connected: integrations.filter((item) => item.status === 'connected').length,
    healthy: integrations.filter((item) => item.health === 'healthy').length,
    attention: integrations.filter((item) => item.health === 'attention').length,
    stale: integrations.filter((item) => item.health === 'stale').length,
  }), [integrations]);
  const visibleIntegrations = useMemo(
    () => sortFeedbackIntegrations(integrations, focusedPlatform),
    [focusedPlatform, integrations]
  );
  const remediationHighlights = useMemo(
    () =>
      buildFeedbackRemediationHighlights({
        integrations,
        syncRunAnalytics: syncAnalytics,
        validationByPlatform,
      }),
    [integrations, syncAnalytics, validationByPlatform]
  );
  const focusNotice = useMemo(
    () =>
      buildFeedbackFocusNotice({
        focusPlatform: focusedPlatform,
        remediationFocus,
      }),
    [focusedPlatform, remediationFocus]
  );

  useEffect(() => {
    setFunnelForm(defaultFunnelForm(data?.funnel || {}));
  }, [data?.funnel]);

  useEffect(() => {
    let cancelled = false;
    const candidates = integrations.filter((integration) => integration.supportsLiveOAuth);
    const serverSnapshots = data?.validationByPlatform || {};
    const hydratedSnapshots = Object.fromEntries(
      candidates
        .map((integration) => [integration.key, serverSnapshots[integration.key] || null])
        .filter(([, validation]) => Boolean(validation))
    );
    const missingCandidates = candidates.filter((integration) => !hydratedSnapshots[integration.key]);

    if (!candidates.length) {
      setValidationByPlatform({});
      return undefined;
    }

    if (!missingCandidates.length) {
      setValidationByPlatform(hydratedSnapshots);
      return undefined;
    }

    setValidationByPlatform(hydratedSnapshots);

    Promise.all(
      missingCandidates.map(async (integration) => {
        try {
          const result = await validateReviewIntegrationOAuth(integration.key);
          return [integration.key, result];
        } catch (validationError) {
          return [integration.key, buildValidationFallback(validationError)];
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setValidationByPlatform({
          ...hydratedSnapshots,
          ...Object.fromEntries(entries),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [data?.validationByPlatform, integrations]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reviewOAuth = params.get('reviewOAuth');
    if (!reviewOAuth) return;

    const platform = params.get('platform') || 'review platform';
    const message = params.get('reviewMessage') || '';
    if (reviewOAuth === 'connected') {
      toast.success(message || `${platform} connected.`);
      refetch();
    } else if (reviewOAuth === 'error') {
      toast.error(message || `Failed to connect ${platform}.`);
    }

    ['reviewOAuth', 'platform', 'reviewMessage'].forEach((key) => params.delete(key));
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [refetch]);

  async function handleIntegrationUpdate(integration, payload) {
    setActiveIntegrationKey(integration.key);
    try {
      await updateIntegration.mutateAsync({
        platform: integration.key,
        payload,
      });
    } finally {
      setActiveIntegrationKey('');
    }
  }

  async function handleToggleIntegration(integration) {
    const nextConnected = integration.status === 'connected' ? false : true;
    const mode = draftModes[integration.key] || integration.mode || 'manual';
    if (nextConnected && mode === 'oauth') {
      if (integration.supportsLiveOAuth) {
        setActionBusyKey(integration.key);
        try {
          const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search || ''}`;
          const result = await startReviewIntegrationOAuth(integration.key, { returnTo });
          window.location.assign(result.authorizationUrl);
          return;
        } catch (oauthError) {
          toast.error(
            oauthError?.response?.data?.error ||
              `Failed to start ${platformDisplayName(integration.key)} connection.`
          );
        } finally {
          setActionBusyKey('');
        }
        return;
      }

      toast.error('This review platform still uses manual mode until its live OAuth flow is enabled.');
      return;
    }

    if (!nextConnected && mode === 'oauth' && integration.supportsLiveOAuth) {
      setActionBusyKey(integration.key);
      try {
        await disconnectReviewIntegrationOAuth(integration.key);
        await refetch();
        toast.success(`${platformDisplayName(integration.key)} disconnected.`);
      } catch (disconnectError) {
        toast.error(
          disconnectError?.response?.data?.error ||
            `Failed to disconnect ${platformDisplayName(integration.key)}.`
        );
      } finally {
        setActionBusyKey('');
      }
      return;
    }

    await handleIntegrationUpdate(integration, {
      connected: nextConnected,
      status: nextConnected ? 'connected' : 'disconnected',
      accountLabel: draftLabels[integration.key] || integration.accountLabel || '',
      mode,
      reviewLink: draftReviewLinks[integration.key] ?? integration.reviewLink ?? '',
      notes: nextConnected ? 'Connection activated from integrations workspace.' : 'Connection disabled from integrations workspace.',
    });
  }

  async function handleSaveIntegrationConfig(integration) {
    await handleIntegrationUpdate(integration, {
      status: integration.status === 'disconnected' ? 'disconnected' : integration.status || 'connected',
      accountLabel: draftLabels[integration.key] || integration.accountLabel || '',
      mode: draftModes[integration.key] || integration.mode || 'manual',
      reviewLink: draftReviewLinks[integration.key] ?? integration.reviewLink ?? '',
      notes: 'Configuration saved from integrations workspace.',
    });
  }

  async function handleConfirmSync(integration) {
    if (
      (draftModes[integration.key] || integration.mode || 'manual') === 'oauth' &&
      integration.supportsLiveSync
    ) {
      setActionBusyKey(integration.key);
      try {
        const result = await syncReviewIntegration(integration.key);
        await refetch();
        toast.success(
          `Synced ${result.reviewsFetched || 0} ${platformDisplayName(integration.key)} review${result.reviewsFetched === 1 ? '' : 's'} across ${result.locationsSynced || 0} location${result.locationsSynced === 1 ? '' : 's'}.`
        );
      } catch (syncError) {
        toast.error(
          syncError?.response?.data?.error ||
            `Failed to sync ${platformDisplayName(integration.key)} reviews.`
        );
      } finally {
        setActionBusyKey('');
      }
      return;
    }

    await handleIntegrationUpdate(integration, {
      status: integration.status === 'needs_attention' ? 'connected' : integration.status || 'connected',
      connected: true,
      accountLabel: draftLabels[integration.key] || integration.accountLabel || '',
      mode: draftModes[integration.key] || integration.mode || 'manual',
      reviewLink: draftReviewLinks[integration.key] ?? integration.reviewLink ?? '',
      lastSyncAt: new Date().toISOString(),
      notes: 'Sync confirmed from integrations workspace.',
    });
  }

  async function handleFlagAttention(integration) {
    await handleIntegrationUpdate(integration, {
      status: 'needs_attention',
      accountLabel: draftLabels[integration.key] || integration.accountLabel || '',
      mode: draftModes[integration.key] || integration.mode || 'manual',
      reviewLink: draftReviewLinks[integration.key] ?? integration.reviewLink ?? '',
      notes: 'Flagged for operator review from integrations workspace.',
    });
  }

  async function handleSaveFunnel() {
    await updateFeedbackSettings.mutateAsync({
      funnel: {
        ...funnelForm,
        lowRatingThreshold: Number(funnelForm.lowRatingThreshold || 3),
        requestWindowHours: Number(funnelForm.requestWindowHours || 72),
      },
    });
  }

  async function handleInjectTestReview() {
    const result = await createTestReview.mutateAsync({
      source: testReviewForm.source,
      rating: Number(testReviewForm.rating || 0),
      author: testReviewForm.author,
      businessLocationLabel: testReviewForm.businessLocationLabel,
      text: testReviewForm.text,
      timestamp: testReviewForm.timestamp ? new Date(testReviewForm.timestamp).toISOString() : null,
      createAlerts: Boolean(testReviewForm.createAlerts),
    });

    setTestReviewForm((current) => ({
      ...current,
      timestamp: toLocalDateTimeInputValue(new Date()),
    }));

    if (result?.reviewId) {
      handleFocusPlatform(String(result.review?.platform || result.source || '').toLowerCase(), 'provider');
    }
  }

  function handleFocusPlatform(platform = '', focus = '') {
    const nextParams = new URLSearchParams(searchParams);
    if (platform) nextParams.set('platform', platform);
    else nextParams.delete('platform');
    if (focus) nextParams.set('focus', focus);
    else nextParams.delete('focus');
    setSearchParams(nextParams, { replace: true });
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
            <Link to={copy.feedbackPath} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
              Back to Feedback
            </Link>
            <Link to={copy.reviewsPath} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
              Open Reviews
            </Link>
          </div>
        </div>

        {!canManage ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Manager or owner access is required to change connection state or funnel settings.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error?.response?.data?.error || 'Failed to load feedback integrations.'}
          </div>
        ) : null}

        {!isLoading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requests Sent</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.requested ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responses</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.responded ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low Ratings</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.lowRatings ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review Invites</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.reviewInvitesSent ?? 0}</p>
            </div>
          </div>
        ) : null}

        {!isLoading ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected Platforms</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{integrationSummary.connected}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Healthy</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{integrationSummary.healthy}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Attention</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{integrationSummary.attention}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sync Checks Needed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{integrationSummary.stale}</p>
            </div>
          </div>
        ) : null}

        {!isLoading && analytics ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invite Conversion</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics?.funnel?.reviewInviteConversionRate ?? 0}%</p>
              <p className="mt-2 text-xs text-slate-500">
                {analytics?.reviews?.total ?? 0} public reviews captured in the last {analytics?.windowDays ?? 30} days.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recovery Resolution</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics?.recovery?.resolutionRate ?? 0}%</p>
              <p className="mt-2 text-xs text-slate-500">
                {analytics?.recovery?.resolved ?? 0} resolved, {analytics?.recovery?.open ?? 0} still open.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review Rating</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics?.reviews?.averageRating ?? '—'}</p>
              <p className="mt-2 text-xs text-slate-500">
                Average imported public rating in the same 30-day window.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sync Attention</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics?.sync?.attentionRequired ?? 0}</p>
              <p className="mt-2 text-xs text-slate-500">
                {analytics?.sync?.pendingRetries ?? 0} pending retries • {analytics?.sync?.overdueRetries ?? 0} overdue retries • {analytics?.sync?.schedulerFailures ?? 0} scheduler failures.
              </p>
            </div>
          </div>
        ) : null}

        {focusedPlatform || remediationFocus ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <div>
              <p className="font-semibold">Remediation focus is active</p>
              <p className="mt-1">{focusNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => handleFocusPlatform('', '')}
              className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Clear focus
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="card">
          <p className="text-sm text-gray-500">Loading feedback integrations…</p>
        </div>
      ) : (
        <>
          <div className="card space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Feedback Funnel</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Use the existing SMS automation stack to request a quick 1–5 rating after calls and optionally after inbound text conversations.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveFunnel}
                disabled={!canManage || updateFeedbackSettings.isPending}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateFeedbackSettings.isPending ? 'Saving…' : 'Save Funnel Settings'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Enable funnel</span>
                <div className="mt-3">
                  <input
                    type="checkbox"
                    checked={funnelForm.enabled}
                    onChange={(event) => setFunnelForm((current) => ({ ...current, enabled: event.target.checked }))}
                    disabled={!canManage}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </label>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Trigger on post-call</span>
                <div className="mt-3">
                  <input
                    type="checkbox"
                    checked={funnelForm.triggerOnPostCall}
                    onChange={(event) => setFunnelForm((current) => ({ ...current, triggerOnPostCall: event.target.checked }))}
                    disabled={!canManage}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </label>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Trigger on inbound SMS</span>
                <div className="mt-3">
                  <input
                    type="checkbox"
                    checked={funnelForm.triggerOnInboundSms}
                    onChange={(event) => setFunnelForm((current) => ({ ...current, triggerOnInboundSms: event.target.checked }))}
                    disabled={!canManage}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </label>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Low-rating threshold</span>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={funnelForm.lowRatingThreshold}
                  onChange={(event) => setFunnelForm((current) => ({ ...current, lowRatingThreshold: event.target.value }))}
                  disabled={!canManage}
                  className="input-field mt-3"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Feedback request template
                <textarea
                  rows="4"
                  value={funnelForm.requestTemplate}
                  onChange={(event) => setFunnelForm((current) => ({ ...current, requestTemplate: event.target.value }))}
                  disabled={!canManage}
                  className="input-field mt-2"
                />
              </label>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Positive reply override
                  <textarea
                    rows="4"
                    value={funnelForm.positiveReplyTemplate}
                    onChange={(event) => setFunnelForm((current) => ({ ...current, positiveReplyTemplate: event.target.value }))}
                    disabled={!canManage}
                    className="input-field mt-2"
                    placeholder="Leave blank to use the built-in thank-you and review-link response."
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Negative reply override
                  <textarea
                    rows="4"
                    value={funnelForm.negativeReplyTemplate}
                    onChange={(event) => setFunnelForm((current) => ({ ...current, negativeReplyTemplate: event.target.value }))}
                    disabled={!canManage}
                    className="input-field mt-2"
                    placeholder="Leave blank to use the built-in service-recovery acknowledgement."
                  />
                </label>
              </div>
            </div>
          </div>

          {analytics ? (
            <div className="card space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reputation Analytics</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Thirty-day feedback, recovery, and public review performance pulled from the existing Merxus review and feedback records.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feedback Funnel</p>
                  <p className="mt-2">Average rating: {analytics?.funnel?.averageRating ?? '—'}</p>
                  <p className="mt-1">Response rate: {analytics?.funnel?.responseRate ?? 0}%</p>
                  <p className="mt-1">Low-rating rate: {analytics?.funnel?.lowRatingRate ?? 0}%</p>
                  <p className="mt-1">Invite send rate: {analytics?.funnel?.reviewInviteSendRate ?? 0}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviews by Platform</p>
                  {(analytics?.reviews?.byPlatform || []).length ? (
                    <div className="mt-2 space-y-1">
                      {analytics.reviews.byPlatform.slice(0, 4).map((item) => (
                        <p key={item.platform}>
                          {platformDisplayName(item.platform)}: {item.count}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2">No public reviews imported in the current window.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply Workflow</p>
                  {(analytics?.reviews?.responseBreakdown || []).length ? (
                    <div className="mt-2 space-y-1">
                      {analytics.reviews.responseBreakdown.slice(0, 4).map((item) => (
                        <p key={item.replyState}>
                          {String(item.replyState || 'none').replace(/_/g, ' ')}: {item.count}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2">No reply-state history yet.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <TrendStrip title="Requests" items={analytics?.trends?.daily || []} metricKey="requestsSent" />
                <TrendStrip title="Public Reviews" items={analytics?.trends?.daily || []} metricKey="publicReviews" colorClass="bg-sky-500" />
                <TrendStrip title="Resolved Recoveries" items={analytics?.trends?.daily || []} metricKey="resolvedRecoveries" colorClass="bg-amber-500" />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reply Performance</p>
                  <p className="mt-2">Approval coverage: {analytics?.replyWorkflow?.approvalCoverageRate ?? 0}%</p>
                  <p className="mt-1">Posting success: {analytics?.replyWorkflow?.postingSuccessRate ?? 0}%</p>
                  <p className="mt-1">Awaiting post: {analytics?.replyWorkflow?.approved ?? 0}</p>
                  <p className="mt-1">
                    Approval to post:{' '}
                    {analytics?.replyWorkflow?.averageApprovalToPostHours != null
                      ? `${analytics.replyWorkflow.averageApprovalToPostHours}h`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source Attribution</p>
                  {(analytics?.sources?.requestBreakdown || []).length ? (
                    <div className="mt-2 space-y-1">
                      {analytics.sources.requestBreakdown.map((item) => (
                        <p key={`request-${item.sourceType}`}>
                          Requests • {labelize(item.sourceType)}: {item.count}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2">No request attribution available yet.</p>
                  )}
                  {(analytics?.sources?.lowRatingBreakdown || []).length ? (
                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                      {analytics.sources.lowRatingBreakdown.map((item) => (
                        <p key={`low-rating-${item.sourceType}`}>
                          Low ratings • {labelize(item.sourceType)}: {item.count}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {(data?.syncRuns || []).length ? (
            <div className="card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Sync Runs</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Scheduler and manual live-sync diagnostics from the existing backend review import loop.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p>Success: {data?.syncRunSummary?.succeeded ?? 0}</p>
                  <p>Failed: {data?.syncRunSummary?.failed ?? 0}</p>
                  <p>Pending retries: {syncAnalytics?.pendingRetries?.length ?? 0}</p>
                  <p>Last run: {formatFeedbackIntegrationDate(data?.syncRunSummary?.lastRunAt)}</p>
                </div>
              </div>

              {syncAnalytics ? (
                <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sync Health</p>
                  <p className="mt-2">Attention required: {syncAnalytics?.health?.attentionRequired ?? 0}</p>
                  <p className="mt-1">Pending retries: {syncAnalytics?.pendingRetries?.length ?? 0}</p>
                  <p className="mt-1">Overdue retries: {syncAnalytics?.overdueRetries?.length ?? 0}</p>
                  <p className="mt-1">Scheduler-triggered failures: {syncAnalytics?.monitoring?.schedulerFailures ?? 0}</p>
                  <p className="mt-1">
                    Stale platforms:{' '}
                    {(syncAnalytics?.health?.stalePlatforms || []).length
                      ? syncAnalytics.health.stalePlatforms.map((platform) => platformDisplayName(platform)).join(', ')
                      : 'None'}
                  </p>
                  {syncAnalytics?.health?.remediationHint ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {syncAnalytics.health.remediationHint}
                    </p>
                  ) : null}
                </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform Mix</p>
                    {(syncAnalytics?.byPlatform || []).length ? (
                      <div className="mt-2 space-y-1">
                        {syncAnalytics.byPlatform.slice(0, 3).map((item) => (
                          <p key={item.platform}>
                            {platformDisplayName(item.platform)}: {item.success}/{item.total} success
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2">No platform sync history yet.</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Failure</p>
                    {syncAnalytics?.recentFailures?.[0] ? (
                      <>
                        <p className="mt-2 font-medium text-slate-900">
                          {platformDisplayName(syncAnalytics.recentFailures[0].platform)}
                        </p>
                        <p className="mt-1 text-red-700">{syncAnalytics.recentFailures[0].error || 'Sync failed.'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFeedbackIntegrationDate(syncAnalytics.recentFailures[0].completedAt)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2">No recent failed sync runs.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {(syncAnalytics?.pendingRetries || []).length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="text-xs font-semibold uppercase tracking-wide">Pending Retries</p>
                  <div className="mt-2 space-y-1">
                    {syncAnalytics.pendingRetries.slice(0, 4).map((run) => (
                      <p key={run.id}>
                        {platformDisplayName(run.platform)} retry at {formatFeedbackIntegrationDate(run.retryAt)}
                        {run.error ? ` • ${run.error}` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                {(data?.syncRuns || []).slice(0, 6).map((run) => (
                  <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {platformDisplayName(run.platform)} • {run.triggeredBy || 'system'}
                      </p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${run.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : run.status === 'failed' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                        {String(run.status || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2">Started: {formatFeedbackIntegrationDate(run.startedAt || run.createdAt)}</p>
                    <p className="mt-1">Completed: {formatFeedbackIntegrationDate(run.completedAt)}</p>
                    <p className="mt-1">Fetched: {run.summary?.reviewsFetched || 0}</p>
                    <p className="mt-1">Created: {run.summary?.reviewsCreated || 0}</p>
                    <p className="mt-1">Updated: {run.summary?.reviewsUpdated || 0}</p>
                    {run.error ? (
                      <p className="mt-2 text-red-700">{run.error}</p>
                    ) : null}
                    {run.retryAt ? (
                      <p className="mt-1 text-amber-700">Retry at: {formatFeedbackIntegrationDate(run.retryAt)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {remediationHighlights.length ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {remediationHighlights.map((item) => (
                <div key={item.key} className={`rounded-3xl border p-5 ${getFeedbackIntegrationRemediationTone(item.tone)}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">{labelize(item.key)}</p>
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm">{item.body}</p>
                  <p className="mt-2 text-xs opacity-80">{item.helper}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">Layer 1 Review Test</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">Inject a simulated review into the live workflow</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This uses the same tenant-scoped <code>/api/reviews/test/review</code> path to write into the existing <code>review_records</code> collection, refresh review workspaces, and optionally trigger the current negative-review alert flow.
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Use this first for positive reviews, negative reviews, and critical-language scenarios before depending on live provider credentials. It helps validate ingestion, classification, alerts, and web/mobile UI visibility with much faster feedback.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 xl:max-w-sm">
                <p className="font-semibold text-slate-900">Recommended cases</p>
                <p className="mt-2">1-star or 2-star review to confirm alerting.</p>
                <p className="mt-1">5-star review to confirm normal non-urgent ingestion.</p>
                <p className="mt-1">Critical language like “refund” to test high-priority handling.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <label className="block text-sm font-medium text-slate-800">
                Source platform
                <select
                  value={testReviewForm.source}
                  onChange={(event) => setTestReviewForm((current) => ({ ...current, source: event.target.value }))}
                  disabled={!canManage || createTestReview.isPending}
                  className="input-field mt-2"
                >
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="trustpilot">Trustpilot</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Rating
                <select
                  value={testReviewForm.rating}
                  onChange={(event) => setTestReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                  disabled={!canManage || createTestReview.isPending}
                  className="input-field mt-2"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`rating-${value}`} value={value}>
                      {value} star{value === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Reviewer name
                <input
                  type="text"
                  value={testReviewForm.author}
                  onChange={(event) => setTestReviewForm((current) => ({ ...current, author: event.target.value }))}
                  disabled={!canManage || createTestReview.isPending}
                  className="input-field mt-2"
                  placeholder="Test User"
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Business location label
                <input
                  type="text"
                  value={testReviewForm.businessLocationLabel}
                  onChange={(event) => setTestReviewForm((current) => ({ ...current, businessLocationLabel: event.target.value }))}
                  disabled={!canManage || createTestReview.isPending}
                  className="input-field mt-2"
                  placeholder="Primary location"
                />
              </label>

              <label className="block text-sm font-medium text-slate-800 xl:col-span-2">
                Review timestamp
                <input
                  type="datetime-local"
                  value={testReviewForm.timestamp}
                  onChange={(event) => setTestReviewForm((current) => ({ ...current, timestamp: event.target.value }))}
                  disabled={!canManage || createTestReview.isPending}
                  className="input-field mt-2"
                />
              </label>

              <label className="block text-sm font-medium text-slate-800 xl:col-span-2">
                Review text
                <textarea
                  value={testReviewForm.text}
                  onChange={(event) => setTestReviewForm((current) => ({ ...current, text: event.target.value }))}
                  disabled={!canManage || createTestReview.isPending}
                  className="input-field mt-2 min-h-[140px]"
                  placeholder="Service was slow and no one called me back."
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={testReviewForm.createAlerts}
                onChange={(event) => setTestReviewForm((current) => ({ ...current, createAlerts: event.target.checked }))}
                disabled={!canManage || createTestReview.isPending}
              />
              Trigger the existing negative-review and review-spike alert flow when the injected review qualifies.
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleInjectTestReview}
                disabled={!canManage || createTestReview.isPending}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createTestReview.isPending ? 'Injecting…' : 'Inject Test Review'}
              </button>
              <button
                type="button"
                onClick={() => setTestReviewForm(defaultTestReviewForm())}
                disabled={createTestReview.isPending}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Scenario
              </button>
              <Link
                to={copy.reviewsPath}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open Review Queue
              </Link>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {visibleIntegrations.map((integration) => {
              const nextMode = draftModes[integration.key] || integration.mode || 'manual';
              const nextReviewLink = draftReviewLinks[integration.key] ?? integration.reviewLink ?? '';
              const validation = validationByPlatform[integration.key] || null;
              const isFocused = integration.key === focusedPlatform;
              const isSaving =
                (updateIntegration.isPending && activeIntegrationKey === integration.key) ||
                actionBusyKey === integration.key;
              const connectLabel =
                integration.status === 'connected'
                  ? nextMode === 'oauth' && integration.supportsLiveOAuth
                    ? 'Disconnect OAuth'
                    : 'Disconnect'
                  : nextMode === 'oauth'
                    ? integration.supportsLiveOAuth
                      ? `Connect ${platformDisplayName(integration.key)}`
                      : 'OAuth Soon'
                    : 'Connect Manually';

              return (
                <div
                  key={integration.key}
                  className={`rounded-[28px] border p-6 shadow-sm ${getFeedbackIntegrationStatusTone(integration.status)} ${isFocused ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{integration.label}</h3>
                      <p className="mt-2 text-sm opacity-90">{integration.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isFocused ? (
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          focused
                        </span>
                      ) : null}
                      <span className="rounded-full border border-current/10 bg-white/70 px-2.5 py-1 text-xs font-semibold">
                        {integration.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getFeedbackIntegrationHealthTone(integration.health)}`}>
                        {integration.healthLabel || integration.health || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm opacity-90">
                    <p>Synced reviews: {integration.syncedReviewCount || 0}</p>
                    <p>Mode: {nextMode}</p>
                    <p>Review link: {integration.reviewLinkPresent ? 'Configured' : 'Missing'}</p>
                    <p>Connected at: {formatFeedbackIntegrationDate(integration.connectedAt)}</p>
                    <p>Last sync: {formatFeedbackIntegrationDate(integration.lastSyncAt)}</p>
                    <p>Latest run: {formatFeedbackIntegrationDate(integration.latestRunAt)}</p>
                    <p>Latest run status: {integration.latestRunStatus || 'not started'}</p>
                    <p>Sync status: {integration.lastSyncStatus || 'not started'}</p>
                    <p>Pending retries: {integration.pendingRetryCount || 0}</p>
                    <p>Last update: {formatFeedbackIntegrationDate(integration.lastUpdatedAt)}</p>
                  </div>

                  {(Number(integration.pendingRetryCount || 0) > 0 || validation?.missingScopes?.length || validation?.liveCheck?.ok === false) ? (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <p className="text-xs font-semibold uppercase tracking-wide">Remediation Focus</p>
                      {Number(integration.pendingRetryCount || 0) > 0 ? (
                        <p className="mt-2">{integration.pendingRetryCount} pending retry item(s) are still open for this provider.</p>
                      ) : null}
                      {validation?.missingScopes?.length ? (
                        <p className="mt-2">Missing scopes: {validation.missingScopes.join(', ')}</p>
                      ) : null}
                      {validation?.liveCheck?.ok === false && validation?.liveCheck?.message ? (
                        <p className="mt-2">{validation.liveCheck.message}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {integration.oauthConnection ? (
                    <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 p-4 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">OAuth Connection</p>
                      <p className="mt-2">Account: {integration.oauthConnection.accountName || integration.oauthConnection.accountEmail || 'Connected account'}</p>
                      <p className="mt-1">Email: {integration.oauthConnection.accountEmail || 'Not available'}</p>
                      <p className="mt-1">Locations: {integration.oauthConnection.locationCount || 0}</p>
                      <p className="mt-1">Connected at: {formatFeedbackIntegrationDate(integration.oauthConnection.connectedAt)}</p>
                    </div>
                  ) : null}

                  {validation ? (
                    <div className={`mt-5 rounded-2xl border p-4 text-sm ${getFeedbackIntegrationValidationTone(validation.status)}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Connection Validation</p>
                      <p className="mt-2">Backend configured: {validation.configured ? 'Yes' : 'No'}</p>
                      <p className="mt-1">Installation stored: {validation.hasInstallation ? 'Yes' : 'No'}</p>
                      <p className="mt-1">Token status: {String(validation.tokenStatus || 'unknown').replace(/_/g, ' ')}</p>
                      <p className="mt-1">Connection status: {labelize(validation.connectionStatus || 'unknown')}</p>
                      <p className="mt-1">Expires: {formatFeedbackIntegrationDate(validation.tokenExpiresAt)}</p>
                      <p className="mt-1">Live check: {validation.liveCheck?.ok ? 'Passed' : 'Needs attention'}</p>
                      {validation.primaryIssueCode ? (
                        <p className="mt-2">
                          Primary issue: {labelize(validation.primaryIssueCode)}
                        </p>
                      ) : null}
                      {validation.diagnostics?.accountSummary ? (
                        <p className="mt-1">
                          Account coverage: {validation.diagnostics.accountSummary.accountCount || 0} account(s), {validation.diagnostics.accountSummary.locationCount || 0} location(s)
                        </p>
                      ) : null}
                      {validation.missingScopes?.length ? (
                        <p className="mt-2">Missing scopes: {validation.missingScopes.join(', ')}</p>
                      ) : null}
                      {validation.liveCheck?.message ? (
                        <p className="mt-2">{validation.liveCheck.message}</p>
                      ) : null}
                      {validation.issues?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {validation.issues.slice(0, 3).map((issue) => (
                            <span
                              key={`${integration.key}-${issue.code}`}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getFeedbackIntegrationIssueTone(issue.severity)}`}
                            >
                              {labelize(issue.code)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {validation.remediation?.primaryAction ? (
                        <p className="mt-2">
                          Primary action: {validation.remediation.primaryAction}
                        </p>
                      ) : null}
                      {validation.recommendedActions?.length ? (
                        <p className="mt-2">
                          Next step: {validation.primaryAction || validation.recommendedActions[0]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {integration.syncSummary ? (
                    <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 p-4 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Latest Sync</p>
                      <p className="mt-2">Fetched: {integration.syncSummary.reviewsFetched || 0}</p>
                      <p className="mt-1">Created: {integration.syncSummary.reviewsCreated || 0}</p>
                      <p className="mt-1">Updated: {integration.syncSummary.reviewsUpdated || 0}</p>
                      <p className="mt-1">Locations: {integration.syncSummary.locationsSynced || 0}</p>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Action Needed</p>
                    <p className="mt-2 leading-6">{integration.actionRequired || 'No immediate action required.'}</p>
                  </div>

                  <label className="mt-5 block text-sm font-medium">
                    Connection mode
                    <select
                      value={nextMode}
                      onChange={(event) => setDraftModes((current) => ({ ...current, [integration.key]: event.target.value }))}
                      disabled={!canManage}
                      className="input-field mt-2 !bg-white/90"
                    >
                      <option value="manual">Manual</option>
                      <option value="oauth">OAuth</option>
                    </select>
                  </label>

                  <label className="mt-5 block text-sm font-medium">
                    Account label
                    <input
                      type="text"
                      value={draftLabels[integration.key] ?? integration.accountLabel ?? ''}
                      onChange={(event) => setDraftLabels((current) => ({ ...current, [integration.key]: event.target.value }))}
                      className="input-field mt-2 !bg-white/90"
                      placeholder={`${integration.label} profile name`}
                      disabled={!canManage}
                    />
                  </label>

                  <label className="mt-5 block text-sm font-medium">
                    Review invite link
                    <input
                      type="url"
                      value={nextReviewLink}
                      onChange={(event) => setDraftReviewLinks((current) => ({ ...current, [integration.key]: event.target.value }))}
                      className="input-field mt-2 !bg-white/90"
                      placeholder={`https://.../${integration.key}`}
                      disabled={!canManage}
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFocusPlatform(integration.key, 'provider')}
                      className="rounded-full border border-current bg-white/80 px-4 py-2 text-sm font-semibold hover:bg-white"
                    >
                      Focus Provider
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveIntegrationConfig(integration)}
                      disabled={!canManage || updateIntegration.isPending}
                      className="rounded-full border border-current bg-white/80 px-4 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : 'Save Config'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleIntegration(integration)}
                      disabled={!canManage || updateIntegration.isPending || (nextMode === 'oauth' && !integration.supportsLiveOAuth && integration.status !== 'connected')}
                      className="rounded-full border border-current bg-white/80 px-4 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : connectLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmSync(integration)}
                      disabled={!canManage || updateIntegration.isPending || isSaving || integration.status === 'disconnected'}
                      className="rounded-full border border-current bg-white/80 px-4 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : nextMode === 'oauth' && integration.supportsLiveSync ? 'Run Live Sync' : 'Confirm Sync'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlagAttention(integration)}
                      disabled={!canManage || updateIntegration.isPending || integration.status === 'disconnected'}
                      className="rounded-full border border-current bg-white/80 px-4 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : 'Flag Attention'}
                    </button>
                    {(integration.status === 'connected' || integration.status === 'detected') ? (
                      <Link
                        to={`${copy.reviewsPath}?platform=${encodeURIComponent(integration.key)}`}
                        className="rounded-full border border-current bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white"
                      >
                        View Synced Reviews
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Recent History</p>
                    {(integration.history || []).length === 0 ? (
                      <p className="mt-3 text-sm opacity-80">No integration updates have been recorded yet.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {integration.history.slice(-4).reverse().map((entry, index) => (
                          <div key={`${entry.createdAt || 'history'}-${index}`} className="rounded-2xl border border-white/70 bg-white/80 p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold">{labelFeedbackHistoryAction(entry.action)}</p>
                              <p className="text-xs opacity-70">{formatFeedbackIntegrationDate(entry.createdAt)}</p>
                            </div>
                            <p className="mt-1 text-xs opacity-70">
                              {entry.actor?.name || entry.actor?.email || 'Operator'}
                              {entry.previousStatus && entry.previousStatus !== entry.status ? ` • ${entry.previousStatus} → ${entry.status}` : ` • ${entry.status}`}
                            </p>
                            <p className="mt-2 text-xs opacity-80">
                              Mode: {entry.mode}
                              {entry.previousMode && entry.previousMode !== entry.mode ? ` (was ${entry.previousMode})` : ''}
                              {' • '}
                              Review link: {entry.reviewLinkPresent ? 'configured' : 'missing'}
                            </p>
                            {entry.notes ? <p className="mt-2 text-sm opacity-90">{entry.notes}</p> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-xs opacity-80">
                    Google Business Profile, Facebook, and Trustpilot now support live OAuth handshakes and real sync import. Remaining review sources can continue to use the existing readiness and manual-config workflow where direct provider connectivity is not yet available.
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
