export function formatAnalyticsActivityDateTime(value) {
  if (!value) return 'Pending timestamp';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Pending timestamp';
  return parsed.toLocaleString();
}

export function getAnalyticsActivityTone(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'notification_job') return 'bg-amber-100 text-amber-700';
  if (normalized === 'review_sync') return 'bg-sky-100 text-sky-700';
  if (normalized === 'automation_alert') return 'bg-rose-100 text-rose-700';
  if (normalized === 'restaurant') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'real_estate') return 'bg-violet-100 text-violet-700';
  if (normalized === 'voice') return 'bg-indigo-100 text-indigo-700';
  return 'bg-slate-100 text-slate-700';
}

export function buildAnalyticsActivityFeedModel(analytics, limit = 8) {
  const items = (analytics?.activityFeed || []).slice(0, limit);
  return {
    items,
    countLabel: `${items.length} recent item${items.length === 1 ? '' : 's'}`,
    hasItems: items.length > 0,
  };
}
