import {
  buildAnalyticsActivityFeedModel,
  formatAnalyticsActivityDateTime,
  getAnalyticsActivityTone,
} from '../../utils/analyticsActivityFeed';

export default function AnalyticsActivityFeedPanel({
  analytics,
  title = 'Recent Activity',
  subtitle = 'The most recent operational events flowing through the live analytics payload.',
  emptyCopy = 'No recent analytics activity has been recorded yet.',
  limit = 8,
}) {
  const { countLabel, hasItems, items } = buildAnalyticsActivityFeedModel(analytics, limit);

  return (
    <div className="card">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {countLabel}
        </div>
      </div>

      {!hasItems ? (
        <p className="mt-4 text-sm text-slate-500">{emptyCopy}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <div key={`${item.type || 'activity'}-${item.occurredAt || index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAnalyticsActivityTone(item.type)}`}>
                      {String(item.type || 'activity').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500">{formatAnalyticsActivityDateTime(item.occurredAt)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{item.title || 'Recent activity'}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.description || 'Operational activity was recorded.'}</p>
                  {item.meta?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.meta.map((metaItem) => (
                        <span key={metaItem} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          {metaItem}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {item.route ? (
                  <a
                    href={item.route}
                    className="inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Open
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
