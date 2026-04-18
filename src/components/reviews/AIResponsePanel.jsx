export default function AIResponsePanel({
  review,
  drafts = [],
  onGenerate,
  onApprove,
  generating = false,
  approving = false,
}) {
  const latestDraft = drafts[0] || null;
  const canApprove = Boolean(review?.id && latestDraft?.id && latestDraft?.status === 'draft');

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Response Panel</p>
          <p className="mt-2 text-sm text-slate-700">
            Generate a fresh public reply draft using the stored review context, sentiment, and prior draft history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || !review?.id}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? 'Generating…' : latestDraft ? 'Generate New Draft' : 'Generate AI Draft'}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={!canApprove || approving}
            className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approving ? 'Approving…' : canApprove ? 'Approve Draft' : 'Draft Approved'}
          </button>
        </div>
      </div>

      {latestDraft ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {latestDraft.createdBy === 'ai' ? 'AI draft' : 'User draft'}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              {latestDraft.status || 'draft'}
            </span>
            {latestDraft.confidence !== null && latestDraft.confidence !== undefined ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                Confidence {Math.round(Number(latestDraft.confidence) * 100)}%
              </span>
            ) : null}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {latestDraft.body || 'No generated draft body is available yet.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            {latestDraft.createdAt ? <span>Created {new Date(latestDraft.createdAt).toLocaleString()}</span> : null}
            {latestDraft.approvedAt ? <span>Approved {new Date(latestDraft.approvedAt).toLocaleString()}</span> : null}
            {latestDraft.postedAt ? <span>Posted {new Date(latestDraft.postedAt).toLocaleString()}</span> : null}
          </div>
          {latestDraft.moderationWarnings?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {latestDraft.moderationWarnings.map((warning) => (
                <span key={warning} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {warning}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              No moderation warnings were flagged on the latest draft.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">No AI response draft yet</p>
          <p className="mt-2 text-sm text-slate-600">
            Generate a public reply to seed the moderation workflow and update the review alert stream.
          </p>
        </div>
      )}
    </div>
  );
}
