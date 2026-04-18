import { useNavigate } from 'react-router-dom';

function badgeClass(requiredTier) {
  if (requiredTier === 'elite') return 'bg-amber-100 text-amber-800';
  if (requiredTier === 'professional') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

export default function PlanGateCard({
  requiredTier = 'professional',
  title,
  description,
  actionPath,
  actionLabel = 'Compare plans',
  className = '',
}) {
  const navigate = useNavigate();

  return (
    <div className={`rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass(requiredTier)}`}>
          {requiredTier}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Locked Section</span>
      </div>
      <h4 className="mt-3 text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(actionPath)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
