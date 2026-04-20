export function labelizeCrossTenantValue(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getCrossTenantToneClasses(severity) {
  const normalized = String(severity || 'healthy').toLowerCase();
  if (normalized === 'critical') return 'border-red-200 bg-red-50 text-red-800';
  if (normalized === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function getCrossTenantBadgeClasses(severity) {
  const normalized = String(severity || 'healthy').toLowerCase();
  if (normalized === 'critical') return 'bg-red-100 text-red-700';
  if (normalized === 'warning') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

export function getNarrativeToneClasses(tone) {
  const normalized = String(tone || 'neutral').toLowerCase();
  if (normalized === 'attention') return 'border-red-200 bg-red-50 text-red-800';
  if (normalized === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (normalized === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

export function buildCrossTenantFocusOptions(selectedFocus = 'all') {
  return ['all', 'restaurant', 'voice', 'real_estate'].map((value) => ({
    key: value,
    label: value === 'all' ? 'All' : labelizeCrossTenantValue(value),
    href: value === 'all' ? '/merxus/analytics' : `/merxus/analytics?focus=${encodeURIComponent(value)}`,
    selected: selectedFocus === value,
  }));
}

export function filterCrossTenantItems(items = [], selectedFocus = 'all') {
  if (selectedFocus === 'all') return items;
  return items.filter((item) => String(item.tenantType) === String(selectedFocus));
}

export function filterCrossTenantQueue(queue = [], selectedFocus = 'all') {
  if (selectedFocus === 'all') return queue;
  return queue.filter((item) => item.tenantType === selectedFocus);
}

export function getCrossTenantTopIssueLabel(topIssue) {
  return topIssue?.key ? labelizeCrossTenantValue(topIssue.key) : 'Healthy';
}
