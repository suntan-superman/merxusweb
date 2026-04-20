function labelize(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({ title, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function TenantFeedbackTrendPanel({
  analytics,
  title = 'Owner Trend View',
  subtitle = 'The dashboard layer beneath your reputation summary: seven-day flow, review capture, recovery movement, and reply execution.',
  emptyCopy = 'Feedback trend data is not available yet for this dashboard.',
}) {
  const feedback = analytics?.feedback || null;
  const daily = feedback?.trends?.daily || [];

  if (!feedback) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <p className="mt-4 text-sm text-slate-500">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Feedback Response"
          value={`${feedback.funnel?.responseRate || 0}%`}
          helper={`Avg private rating ${feedback.funnel?.averageRating ?? '—'}`}
        />
        <MetricCard
          title="Invite Conversion"
          value={`${feedback.funnel?.reviewInviteConversionRate || 0}%`}
          helper={`${feedback.reviews?.total || 0} public reviews in window`}
        />
        <MetricCard
          title="Recovery Resolution"
          value={`${feedback.recovery?.resolutionRate || 0}%`}
          helper={`${feedback.recovery?.resolved || 0} resolved • ${feedback.recovery?.open || 0} open`}
        />
        <MetricCard
          title="Reply Posting"
          value={`${feedback.replyWorkflow?.postingSuccessRate || 0}%`}
          helper={`${feedback.replyWorkflow?.posted || 0} posted • ${feedback.replyWorkflow?.failed || 0} failed`}
        />
      </div>

      {!daily.length ? (
        <p className="text-sm text-slate-500">{emptyCopy}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Seven-Day Feedback Flow</p>
              <p className="mt-1 text-sm text-slate-500">Requests, public reviews, recovery resolutions, and posted replies grouped by day.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {feedback.trends?.days || daily.length}d
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {daily.map((item) => (
              <div key={item.date} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Requests</span>
                    <span className="font-semibold text-slate-900">{item.requestsSent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Reviews</span>
                    <span className="font-semibold text-slate-900">{item.publicReviews || 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Recoveries</span>
                    <span className="font-semibold text-slate-900">{item.resolvedRecoveries || 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Replies</span>
                    <span className="font-semibold text-slate-900">{item.postedReplies || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top Request Sources</p>
              <div className="mt-3 space-y-2">
                {(feedback.sources?.requestBreakdown || []).slice(0, 4).map((item) => (
                  <div key={`request-${item.sourceType}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                    <span>{labelize(item.sourceType)}</span>
                    <span className="font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
                {!(feedback.sources?.requestBreakdown || []).length ? (
                  <p className="text-sm text-slate-500">No request-source attribution is available yet.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Platform Mix</p>
              <div className="mt-3 space-y-2">
                {(feedback.reviews?.byPlatform || []).slice(0, 4).map((item) => (
                  <div key={`platform-${item.platform}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                    <span>{labelize(item.platform)}</span>
                    <span className="font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
                {!(feedback.reviews?.byPlatform || []).length ? (
                  <p className="text-sm text-slate-500">No public review platform data has been imported yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
