import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchMergeAudits } from '../../api/graph';
import { getPortalBasePath } from '../../utils/objectRouting';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Merge Activity',
      subtitle: 'Review duplicate-resolution history for guest profiles and see how merge decisions changed downstream graph data.',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'Merge Activity',
      subtitle: 'Review customer and property merge decisions, audit impact, and operator ownership across the graph layer.',
    };
  }
  return {
    title: 'Merge Activity',
    subtitle: 'Review duplicate-resolution history for caller profiles and graph-backed work-intake records.',
  };
}

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

function formatLabel(value) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function toneForAction(action) {
  return action === 'merged'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-slate-200 bg-slate-50 text-slate-900';
}

function formatAffectedCounts(affectedCounts = {}) {
  return Object.entries(affectedCounts || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([key, count]) => `${key.replace(/_/g, ' ')}: ${count}`)
    .join(' · ');
}

function describeEntity(audit = {}) {
  if (audit.candidateType === 'property') {
    return audit.snapshots?.primarySnapshot?.address || audit.primaryId || 'Property merge';
  }
  return (
    audit.snapshots?.primarySnapshot?.displayName ||
    audit.snapshots?.primarySnapshot?.phone ||
    audit.snapshots?.primarySnapshot?.email ||
    audit.primaryId ||
    'Customer merge'
  );
}

function describeDuplicate(audit = {}) {
  if (audit.candidateType === 'property') {
    return audit.snapshots?.duplicateSnapshot?.address || audit.duplicateId || 'Unknown property';
  }
  return (
    audit.snapshots?.duplicateSnapshot?.displayName ||
    audit.snapshots?.duplicateSnapshot?.phone ||
    audit.snapshots?.duplicateSnapshot?.email ||
    audit.duplicateId ||
    'Unknown customer'
  );
}

function resolvePrimaryRoute(tenantType, audit = {}) {
  const portalBasePath = getPortalBasePath(tenantType);
  if (!portalBasePath || !audit?.primaryId) {
    return null;
  }

  if (audit.candidateType === 'property' && tenantType === 'real_estate') {
    return {
      label: 'Open Primary Listing',
      path: `${portalBasePath}/listings/${encodeURIComponent(audit.primaryId)}`,
    };
  }

  if (audit.candidateType === 'customer') {
    return {
      label: 'Open Primary Customer',
      path: `${portalBasePath}/customer-360/${encodeURIComponent(audit.primaryId)}`,
    };
  }

  return null;
}

const CANDIDATE_TYPE_OPTIONS = [
  { value: '', label: 'All entity types' },
  { value: 'customer', label: 'Customer merges' },
  { value: 'property', label: 'Property merges' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All decisions' },
  { value: 'merged', label: 'Merged' },
  { value: 'dismissed', label: 'Dismissed' },
];

export default function MergeActivityWorkspace({ tenantType }) {
  const copy = copyForTenant(tenantType);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    candidateType: searchParams.get('candidateType') || '',
    action: searchParams.get('action') || '',
    entityId: searchParams.get('entityId') || '',
    search: searchParams.get('search') || '',
    limit: 100,
  });
  const [audits, setAudits] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedAuditId, setSelectedAuditId] = useState(searchParams.get('auditId') || '');

  async function loadAudits({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      const response = await fetchMergeAudits({
        candidateType: filters.candidateType || undefined,
        action: filters.action || undefined,
        entityIds: filters.entityId || undefined,
        limit: filters.limit,
      });
      setAudits(response.audits || []);
      setSummary(response.summary || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load merge audit activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAudits();
  }, [filters.action, filters.candidateType, filters.entityId, filters.limit]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.candidateType) nextParams.set('candidateType', filters.candidateType);
    if (filters.action) nextParams.set('action', filters.action);
    if (filters.entityId) nextParams.set('entityId', filters.entityId);
    if (filters.search) nextParams.set('search', filters.search);
    if (selectedAuditId) nextParams.set('auditId', selectedAuditId);
    setSearchParams(nextParams, { replace: true });
  }, [filters.action, filters.candidateType, filters.entityId, filters.search, selectedAuditId, setSearchParams]);

  const filteredAudits = useMemo(() => {
    const needle = String(filters.search || '').trim().toLowerCase();
    if (!needle) {
      return audits;
    }

    return audits.filter((audit) =>
      [
        audit.candidateType,
        audit.action,
        audit.reason,
        audit.actor?.email,
        audit.actor?.name,
        describeEntity(audit),
        describeDuplicate(audit),
        formatAffectedCounts(audit.affectedCounts),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(needle)
    );
  }, [audits, filters.search]);

  useEffect(() => {
    if (!filteredAudits.length) {
      setSelectedAuditId('');
      return;
    }

    if (!selectedAuditId || !filteredAudits.some((audit) => audit.id === selectedAuditId)) {
      setSelectedAuditId(filteredAudits[0].id);
    }
  }, [filteredAudits, selectedAuditId]);

  const selectedAudit = useMemo(
    () => filteredAudits.find((audit) => audit.id === selectedAuditId) || null,
    [filteredAudits, selectedAuditId]
  );

  const summaryCards = [
    { label: 'Total Decisions', value: summary?.total || 0 },
    { label: 'Merged', value: summary?.merged || 0 },
    { label: 'Dismissed', value: summary?.dismissed || 0 },
    {
      label: 'Operators',
      value: new Set(
        audits
          .map((audit) => audit.actor?.email || audit.actor?.uid)
          .filter(Boolean)
      ).size,
    },
  ];

  const entityBreakdown = useMemo(() => ({
    customer: audits.filter((audit) => audit.candidateType === 'customer').length,
    property: audits.filter((audit) => audit.candidateType === 'property').length,
  }), [audits]);

  function handleOpenPrimaryRecord() {
    const route = resolvePrimaryRoute(tenantType, selectedAudit);
    if (route?.path) {
      navigate(route.path);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600">Graph Operations</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            Customer decisions: {entityBreakdown.customer}
          </span>
          {tenantType === 'real_estate' ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Property decisions: {entityBreakdown.property}
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.candidateType}
            onChange={(event) => setFilters((current) => ({ ...current, candidateType: event.target.value }))}
          >
            {CANDIDATE_TYPE_OPTIONS
              .filter((option) => option.value !== 'property' || tenantType === 'real_estate')
              .map((option) => (
                <option key={option.value || 'all-types'} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || 'all-actions'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            placeholder="Filter by entity ID"
            value={filters.entityId}
            onChange={(event) => setFilters((current) => ({ ...current, entityId: event.target.value }))}
          />
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 md:col-span-4"
            placeholder="Search entities, reasons, operators, or impact"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadAudits({ silent: true })}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-fuchsia-200 hover:text-fuchsia-700"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {(filters.candidateType || filters.action || filters.entityId || filters.search) ? (
            <button
              type="button"
              onClick={() => setFilters((current) => ({
                ...current,
                candidateType: '',
                action: '',
                entityId: '',
                search: '',
              }))}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Audit Timeline</h2>
              <p className="text-sm text-slate-500">
                {filteredAudits.length} decision{filteredAudits.length === 1 ? '' : 's'} in the current view
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading merge activity…
              </div>
            ) : null}

            {!loading && !filteredAudits.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No merge audit entries match the current filters.
              </div>
            ) : null}

            {!loading && filteredAudits.map((audit) => (
              <button
                type="button"
                key={audit.id}
                onClick={() => setSelectedAuditId(audit.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedAudit?.id === audit.id
                    ? 'border-fuchsia-300 bg-fuchsia-50/60'
                    : 'border-slate-200 hover:border-fuchsia-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneForAction(audit.action)}`}>
                        {formatLabel(audit.action)}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {formatLabel(audit.candidateType)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{describeEntity(audit)}</h3>
                    <p className="mt-1 text-sm text-slate-600">Duplicate: {describeDuplicate(audit)}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{formatTimestamp(audit.createdAt)}</p>
                    <p className="mt-1">{audit.actor?.email || audit.actor?.uid || 'Unknown operator'}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Reason: {formatLabel(audit.reason)}
                  {audit.confidence ? ` · Confidence ${(Number(audit.confidence || 0) * 100).toFixed(0)}%` : ''}
                </p>
                {formatAffectedCounts(audit.affectedCounts) ? (
                  <p className="mt-2 text-xs text-slate-500">Impact: {formatAffectedCounts(audit.affectedCounts)}</p>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedAudit ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-600">
                    {formatLabel(selectedAudit.candidateType)} · {formatLabel(selectedAudit.action)}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{describeEntity(selectedAudit)}</h2>
                  <p className="mt-2 text-sm text-slate-600">Duplicate: {describeDuplicate(selectedAudit)}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{formatTimestamp(selectedAudit.createdAt)}</p>
                  <p className="mt-1">{selectedAudit.actor?.email || selectedAudit.actor?.uid || 'Unknown operator'}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Decision" value={formatLabel(selectedAudit.action)} compact />
                <SummaryCard
                  label="Confidence"
                  value={selectedAudit.confidence ? `${(Number(selectedAudit.confidence || 0) * 100).toFixed(0)}%` : '—'}
                  compact
                />
                <SummaryCard
                  label="Impact Records"
                  value={Object.values(selectedAudit.affectedCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0)}
                  compact
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {resolvePrimaryRoute(tenantType, selectedAudit) ? (
                  <button
                    type="button"
                    onClick={handleOpenPrimaryRecord}
                    className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
                  >
                    {resolvePrimaryRoute(tenantType, selectedAudit).label}
                  </button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Decision Context</p>
                <p className="mt-2">Reason: {formatLabel(selectedAudit.reason)}</p>
                <p className="mt-1">Candidate ID: {selectedAudit.candidateId || '—'}</p>
                <p className="mt-1">Primary ID: {selectedAudit.primaryId || '—'}</p>
                <p className="mt-1">Duplicate ID: {selectedAudit.duplicateId || '—'}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700">Affected Records</h3>
                <div className="mt-3 space-y-2">
                  {Object.entries(selectedAudit.affectedCounts || {})
                    .filter(([, count]) => Number(count || 0) > 0)
                    .map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        <span className="text-slate-700">{formatLabel(key)}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                    ))}
                  {!Object.keys(selectedAudit.affectedCounts || {}).some((key) => Number(selectedAudit.affectedCounts?.[key] || 0) > 0) ? (
                    <p className="text-sm text-slate-500">No downstream record counts were captured for this decision.</p>
                  ) : null}
                </div>
              </div>

              <SnapshotBlock title="Primary Snapshot" value={selectedAudit.snapshots?.primarySnapshot} />
              <SnapshotBlock title="Duplicate Snapshot" value={selectedAudit.snapshots?.duplicateSnapshot} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Select a merge audit entry to inspect its decision context and downstream graph impact.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, compact = false }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 ${compact ? 'px-4 py-3' : 'px-4 py-3'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-2 font-semibold text-slate-900 ${compact ? 'text-xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function SnapshotBlock({ title, value }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <pre className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </div>
  );
}
