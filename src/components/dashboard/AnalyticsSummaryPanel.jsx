import {
  buildAnalyticsSummaryViewModel,
  getAnalyticsSummaryStatusLabel,
  getAnalyticsSummaryToneClass,
} from '../../utils/analyticsSummary';

export default function AnalyticsSummaryPanel({
  analytics,
  title = 'Operational Snapshot',
  subtitle = 'Key owner and operator signals from the live analytics payload.',
  emptyCopy = 'Analytics summary is not available yet.',
}) {
  const { hasHighlights, hasOperatorFocus, hasSummary, operatorFocus, statusPill, summary } =
    buildAnalyticsSummaryViewModel(analytics);

  if (!hasSummary) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getAnalyticsSummaryToneClass(summary.status)}`}>
          {statusPill}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(summary.cards || []).map((card) => (
          <div key={card.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getAnalyticsSummaryToneClass(card.tone)}`}>
                {getAnalyticsSummaryStatusLabel(card.tone)}
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
            {card.route ? (
              <a
                href={card.route}
                className="mt-3 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
              >
                Open
              </a>
            ) : null}
          </div>
        ))}
      </div>

      {hasHighlights ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {(summary.highlights || []).map((item) => (
            <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getAnalyticsSummaryToneClass(item.tone)}`}>
                  {getAnalyticsSummaryStatusLabel(item.tone)}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              {item.route ? (
                <a
                  href={item.route}
                  className="mt-3 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Review
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {hasOperatorFocus ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {operatorFocus.map((item) => (
            <div key={item.key} className={`rounded-2xl border p-4 ${getAnalyticsSummaryToneClass(item.tone)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Operator Focus</p>
              <p className="mt-3 text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-sm opacity-90">{item.description}</p>
              {item.route ? (
                <a
                  href={item.route}
                  className="mt-3 inline-flex rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                >
                  Open
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
