export function getAnalyticsSummaryToneClass(tone) {
  const normalized = String(tone || '').toLowerCase();
  if (normalized === 'healthy') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'attention') return 'bg-red-100 text-red-700 border-red-200';
  if (normalized === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (normalized === 'neutral') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function getAnalyticsSummaryStatusLabel(status) {
  const normalized = String(status || 'healthy').toLowerCase();
  if (normalized === 'attention') return 'Attention';
  if (normalized === 'warning') return 'Warning';
  if (normalized === 'neutral') return 'Context';
  return 'Healthy';
}

export function buildAnalyticsSummaryViewModel(analytics) {
  const summary = analytics?.dashboardSummary || null;
  const operatorFocus = summary?.operatorFocus || [];

  return {
    summary,
    operatorFocus,
    hasSummary: Boolean(summary),
    hasHighlights: Boolean(summary?.highlights?.length),
    hasOperatorFocus: operatorFocus.length > 0,
    statusPill: summary
      ? `${getAnalyticsSummaryStatusLabel(summary.status)} • ${summary.attentionCount || 0} active signals`
      : null,
  };
}
