function badgeClass(tier) {
  if (tier === 'elite') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (tier === 'professional') return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function PlanTierBadge({
  tier = 'base',
  label = 'Base',
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClass(tier)} ${className}`}
    >
      {label}
    </span>
  );
}
