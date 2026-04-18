import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useFeedbackSettings,
  useUpdateFeedbackSettings,
  useUpdateReviewIntegration,
} from '../../hooks/useReviewQueries';

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

function statusTone(status) {
  if (status === 'connected') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'needs_attention') return 'border-red-200 bg-red-50 text-red-800';
  if (status === 'detected') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
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

export default function FeedbackIntegrationsWorkspace({ tenantType }) {
  const copy = copyForTenant(tenantType);
  const { userClaims } = useAuth();
  const { data, isLoading, error } = useFeedbackSettings();
  const updateIntegration = useUpdateReviewIntegration();
  const updateFeedbackSettings = useUpdateFeedbackSettings();
  const [draftLabels, setDraftLabels] = useState({});
  const [draftModes, setDraftModes] = useState({});
  const [draftReviewLinks, setDraftReviewLinks] = useState({});
  const [funnelForm, setFunnelForm] = useState(defaultFunnelForm());

  const integrations = data?.integrations || [];
  const stats = data?.stats || {};
  const role = String(userClaims?.role || 'staff').toLowerCase();
  const canManage = role === 'owner' || role === 'manager';

  useEffect(() => {
    setFunnelForm(defaultFunnelForm(data?.funnel || {}));
  }, [data?.funnel]);

  async function handleToggleIntegration(integration) {
    const nextConnected = integration.status === 'connected' ? false : true;
    const mode = draftModes[integration.key] || integration.mode || 'manual';
    await updateIntegration.mutateAsync({
      platform: integration.key,
      payload: {
        connected: nextConnected,
        status: nextConnected ? 'connected' : 'disconnected',
        accountLabel: draftLabels[integration.key] || integration.accountLabel || '',
        mode,
        reviewLink: draftReviewLinks[integration.key] ?? integration.reviewLink ?? '',
      },
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

          <div className="grid gap-6 xl:grid-cols-3">
            {integrations.map((integration) => {
              const nextMode = draftModes[integration.key] || integration.mode || 'manual';
              const nextReviewLink = draftReviewLinks[integration.key] ?? integration.reviewLink ?? '';
              const connectLabel =
                integration.status === 'connected'
                  ? 'Disconnect'
                  : nextMode === 'oauth'
                    ? 'Connect OAuth'
                    : 'Connect Manually';

              return (
                <div key={integration.key} className={`rounded-[28px] border p-6 shadow-sm ${statusTone(integration.status)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{integration.label}</h3>
                      <p className="mt-2 text-sm opacity-90">{integration.description}</p>
                    </div>
                    <span className="rounded-full border border-current/10 bg-white/70 px-2.5 py-1 text-xs font-semibold">
                      {integration.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-sm opacity-90">
                    <p>Synced reviews: {integration.syncedReviewCount || 0}</p>
                    <p>Connected at: {formatDate(integration.connectedAt)}</p>
                    <p>Last sync: {formatDate(integration.lastSyncAt)}</p>
                    <p>Last update: {formatDate(integration.lastUpdatedAt)}</p>
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
                      onClick={() => handleToggleIntegration(integration)}
                      disabled={!canManage || updateIntegration.isPending}
                      className="rounded-full border border-current bg-white/80 px-4 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateIntegration.isPending ? 'Saving…' : connectLabel}
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

                  <p className="mt-4 text-xs opacity-80">
                    OAuth mode records connection intent and status in tenant settings. A live third-party OAuth handshake is not yet wired for this platform.
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
