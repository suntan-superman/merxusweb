import { buildSystemOperationsConsoleModel } from '../../utils/systemOperationsConsole';

function StatTile({ title, value, helper, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    sky: 'bg-sky-50 border-sky-200 text-sky-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {helper ? <p className="mt-2 text-sm opacity-75">{helper}</p> : null}
    </div>
  );
}

function SpotlightCard({ title, value, helper, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{title}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
      {helper ? <p className="mt-2 text-sm opacity-80">{helper}</p> : null}
    </div>
  );
}

export default function SystemOperationsConsolePanel({
  analytics,
  title = 'System Console',
  subtitle = 'A command-style readout of platform pressure, recent failure hotspots, and the live operating curve across the last few days.',
}) {
  const {
    daily,
    maxSignals,
    spotlights,
    monitoringCards,
    statCards,
    trendWindowDays,
  } = buildSystemOperationsConsoleModel(analytics);

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <StatTile
            key={card.title}
            title={card.title}
            value={card.value}
            helper={card.helper}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Seven-Day Operating Curve</p>
              <p className="mt-1 text-sm text-slate-500">Green bars reflect successful delivery volume. Red bars show pressure from failed, pending, or critical issues.</p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {trendWindowDays}d window
            </div>
          </div>

          {!daily.length ? (
            <p className="mt-4 text-sm text-slate-500">Operational trend data is not available yet.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {daily.map((item) => {
                const successHeight = maxSignals > 0 ? Math.max(10, Math.round((item.successSignals / maxSignals) * 86)) : 10;
                const attentionHeight = maxSignals > 0 ? Math.max(item.attentionSignals ? 10 : 0, Math.round((item.attentionSignals / maxSignals) * 86)) : 0;

                return (
                  <div key={item.date} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex h-28 items-end gap-1.5">
                      <div className="flex-1 rounded-2xl bg-slate-100 p-1">
                        <div className="flex h-full items-end">
                          <div className="w-full rounded-xl bg-emerald-500" style={{ height: `${successHeight}px` }} />
                        </div>
                      </div>
                      <div className="flex-1 rounded-2xl bg-slate-100 p-1">
                        <div className="flex h-full items-end">
                          <div className="w-full rounded-xl bg-rose-500" style={{ height: `${attentionHeight}px` }} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <p>{item.successSignals} success</p>
                      <p>{item.attentionSignals} attention</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {spotlights.map((card) => (
            <SpotlightCard
              key={card.title}
              title={card.title}
              value={card.value}
              helper={card.helper}
              tone={card.tone}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {monitoringCards.map((card) => (
          <SpotlightCard
            key={card.title}
            title={card.title}
            value={card.value}
            helper={card.helper}
            tone={card.tone}
          />
        ))}
      </div>
    </div>
  );
}
