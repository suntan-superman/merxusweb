export function getFeedbackIntegrationStatusTone(status) {
  if (status === 'connected') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'needs_attention') return 'border-red-200 bg-red-50 text-red-800';
  if (status === 'detected') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function getFeedbackIntegrationHealthTone(health) {
  if (health === 'healthy') return 'bg-emerald-100 text-emerald-700';
  if (health === 'stale') return 'bg-amber-100 text-amber-700';
  if (health === 'attention') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export function formatFeedbackIntegrationDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

export function getFeedbackIntegrationValidationTone(status) {
  if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'attention') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function getFeedbackIntegrationIssueTone(severity) {
  if (severity === 'critical') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-sky-200 bg-sky-50 text-sky-700';
}

export function labelFeedbackHistoryAction(action) {
  const normalized = String(action || 'updated').replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getFeedbackIntegrationRemediationTone(tone) {
  if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-800';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}
