import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSystemOperationsAudit } from '../../api/merxus';
import { downloadCsvFile } from '../../utils/csv';
import {
  buildOpsAuditExportRows,
  formatAuditDateTime,
  getAuditStatusLabel,
  getAuditToneClasses,
  labelizeAuditValue,
  normalizeOpsAuditFilters,
  sortOpsAuditSections,
  sortOpsAuditTenantHighlights,
  sortOpsAuditTopFindings,
} from '../../utils/merxusOpsAudit';

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function MerxusOpsAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = useMemo(() => normalizeOpsAuditFilters(searchParams), [searchParams]);
  const focusSection = String(searchParams.get('focusSection') || '').trim().toLowerCase();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await fetchSystemOperationsAudit(filters);
        if (active) {
          setReport(data);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load the operations audit.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filters]);

  function updateFilters(nextValues) {
    const merged = {
      ...filters,
      ...nextValues,
    };
    const nextFocusSection =
      Object.prototype.hasOwnProperty.call(nextValues, 'focusSection')
        ? String(nextValues.focusSection || '').trim().toLowerCase()
        : focusSection;
    const nextParams = new URLSearchParams();
    nextParams.set('days', String(merged.days));
    nextParams.set('maxTenants', String(merged.maxTenants));
    nextParams.set('limitPerTenant', String(merged.limitPerTenant));
    if (merged.tenantType) nextParams.set('tenantType', merged.tenantType);
    if (merged.tenantId) nextParams.set('tenantId', merged.tenantId);
    if (merged.attentionOnly) nextParams.set('attentionOnly', 'true');
    if (nextFocusSection) nextParams.set('focusSection', nextFocusSection);
    setSearchParams(nextParams, { replace: true });
  }

  const summary = report?.summary || null;
  const sections = report?.sections || [];
  const topFindings = report?.topFindings || [];
  const commands = report?.commands || [];
  const audits = report?.audits || {};
  const tenantHighlights = report?.tenantHighlights || [];
  const visibleSections = useMemo(() => sortOpsAuditSections(sections, focusSection), [focusSection, sections]);
  const visibleTopFindings = useMemo(() => sortOpsAuditTopFindings(topFindings, focusSection), [focusSection, topFindings]);
  const visibleTenantHighlights = useMemo(
    () => sortOpsAuditTenantHighlights(tenantHighlights, focusSection),
    [focusSection, tenantHighlights]
  );
  const exportRows = useMemo(() => buildOpsAuditExportRows(report), [report]);

  function handleExportCsv() {
    if (!exportRows.length) return;
    downloadCsvFile('merxus-ops-audit.csv', exportRows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operations Audit</h1>
          <p className="mt-2 text-gray-600">
            Consolidated review, push, scheduler, and alert pressure from the same backend audit services used for staging and production triage.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Generated: {formatAuditDateTime(report?.generatedAt)}
          </p>
          {summary?.headline ? (
            <p className="mt-2 text-sm text-slate-600">{summary.headline}</p>
          ) : null}
        </div>
        <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${getAuditToneClasses(summary?.severity || summary?.status)}`}>
          {getAuditStatusLabel(summary?.severity || summary?.status)}{summary ? ` - ${summary.attentionSections || 0} section(s) need attention` : ''}
        </div>
      </div>

      <SectionCard
        title="Workspace Actions"
        subtitle="Export the current audit payload or jump directly into the shared readiness workspace."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Export CSV
          </button>
          <a
            href="/merxus/production-readiness"
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open Production Readiness
          </a>
        </div>
      </SectionCard>

      <SectionCard
        title="Audit Controls"
        subtitle="Use the same filters that drive the backend CLI and admin API route."
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Window</p>
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              {[7, 30, 90].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFilters({ days: value })}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    filters.days === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant Type</span>
            <select
              value={filters.tenantType}
              onChange={(event) => updateFilters({ tenantType: event.target.value })}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="">All tenant types</option>
              <option value="restaurant">Restaurant</option>
              <option value="voice">Voice</option>
              <option value="real_estate">Real Estate</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant Id</span>
            <input
              type="text"
              value={filters.tenantId}
              onChange={(event) => updateFilters({ tenantId: event.target.value.trim() })}
              placeholder="Optional tenant id"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Scope</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs text-slate-500">Max tenants</span>
                <input
                  type="number"
                  min="1"
                  value={filters.maxTenants}
                  onChange={(event) => updateFilters({ maxTenants: Number(event.target.value || 500) })}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs text-slate-500">Per-tenant limit</span>
                <input
                  type="number"
                  min="1"
                  value={filters.limitPerTenant}
                  onChange={(event) => updateFilters({ limitPerTenant: Number(event.target.value || 100) })}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.attentionOnly}
                onChange={(event) => updateFilters({ attentionOnly: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Show attention-only results
            </label>
          </div>
        </div>
      </SectionCard>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
              <p className="mt-4 text-gray-600">Loading operations audit...</p>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && summary ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Attention Sections"
              value={summary.attentionSections || 0}
              helper={`${summary.totalSections || 0} total audited sections`}
            />
            <StatCard
              label="Critical Sections"
              value={summary.criticalSections || 0}
              helper="Immediate operational follow-up required"
            />
            <StatCard
              label="Warning Sections"
              value={summary.warningSections || 0}
              helper="Operational drift or backlog is present"
            />
            <StatCard
              label="Audit Scope"
              value={`${report?.filters?.days || filters.days}d`}
              helper={`Up to ${report?.filters?.maxTenants || filters.maxTenants} tenants scanned`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Top Findings"
              subtitle="Severity-ranked issues derived from the consolidated audit report."
            >
              {topFindings.length ? (
            <div className="space-y-3">
                {visibleTopFindings.map((item) => (
                    <div key={item.key} className={`rounded-2xl border p-4 ${getAuditToneClasses(item.severity)}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{item.label}</p>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold">
                          {getAuditStatusLabel(item.severity)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{item.headline}</p>
                      <p className="mt-3 text-xs opacity-80">
                        Attention count: {item.attentionCount || 0}
                      </p>
                      {(item.recommendedActions || []).length ? (
                        <div className="mt-3 space-y-1">
                          {item.recommendedActions.slice(0, 2).map((action) => (
                            <p key={`${item.key}-${action}`} className="text-xs opacity-85">
                              {action}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <code className="mt-3 block rounded-2xl bg-white/70 px-3 py-2 text-xs">
                        {item.actionCommand}
                      </code>
                      {item.route ? (
                        <a
                          href={item.route}
                          className="mt-3 inline-flex rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold hover:bg-white"
                        >
                          Open Filtered Audit
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No active findings were returned for the current filter set.</p>
              )}
            </SectionCard>

            <SectionCard
              title="Operator Commands"
              subtitle="These are the same commands surfaced by the backend readiness report for live deployment validation."
            >
              <div className="space-y-3">
                {commands.map((command) => (
                  <code key={command} className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {command}
                  </code>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Audit Sections"
            subtitle="Each section is built from existing subsystem audit services instead of a duplicate reporting path."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleSections.map((section) => (
                <div key={section.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{section.label}</h3>
                      <p className="mt-1 text-sm text-slate-600">{section.headline}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAuditToneClasses(section.severity)}`}>
                      {getAuditStatusLabel(section.severity)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {Object.entries(section.metrics || {}).map(([key, value]) => (
                      <MetricRow key={key} label={labelizeAuditValue(key)} value={value} />
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Action Command</p>
                    <code className="mt-2 block text-xs text-slate-700">{section.actionCommand}</code>
                  </div>
                  {(section.recommendedActions || []).length ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended Actions</p>
                      <div className="mt-2 space-y-1">
                        {section.recommendedActions.map((action) => (
                          <p key={`${section.key}-${action}`} className="text-sm text-slate-700">
                            {action}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {section.route ? (
                    <a
                      href={section.route}
                      className="mt-4 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Focus Section
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Tenant Pressure"
            subtitle="The highest-pressure tenants surfaced from the underlying audit payloads so operators can see who is driving the current attention state."
          >
            {tenantHighlights.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleTenantHighlights.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.tenantName}</p>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {labelizeAuditValue(item.tenantType)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.auditLabel}</p>
                    <p className="mt-3 text-sm text-slate-800">{item.pressure}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.route ? (
                        <a
                          href={item.route}
                          className="inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                        >
                          Open Filtered Audit
                        </a>
                      ) : null}
                      {item.analyticsRoute ? (
                        <a
                          href={item.analyticsRoute}
                          className="inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                        >
                          Open Analytics Context
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No tenant-level pressure items were returned for the current filter set.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Detailed Summaries"
            subtitle="High-level counts from each underlying audit payload so operators can decide where to drill deeper."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {Object.entries(audits).map(([key, audit]) => (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{labelizeAuditValue(key)}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getAuditToneClasses(audit?.summary?.status || summary?.status)}`}>
                      {getAuditStatusLabel(audit?.summary?.status || 'healthy')}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {Object.entries(audit?.summary || {}).length ? (
                      Object.entries(audit.summary).map(([metricKey, value]) => (
                        <MetricRow key={`${key}-${metricKey}`} label={labelizeAuditValue(metricKey)} value={value} />
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No summary metrics available for this audit.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
