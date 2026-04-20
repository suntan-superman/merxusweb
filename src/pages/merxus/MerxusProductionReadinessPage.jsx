import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSystemProductionReadiness } from '../../api/merxus';
import { downloadCsvFile } from '../../utils/csv';
import {
  buildReadinessExportRows,
  buildReadinessFocusOptions,
  filterReadinessItemsByFocus,
  formatRuntimePath,
  getReadinessToneClasses,
} from '../../utils/merxusProductionReadiness';

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

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function MerxusProductionReadinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const focus = String(searchParams.get('focus') || '').trim();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await fetchSystemProductionReadiness();
        if (active) {
          setReport(data);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load production readiness.');
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
  }, []);

  const blockers = report?.deployBlockers || [];
  const validationByCategory = report?.manualValidationByCategory || {};
  const validationCategories = report?.validationCategories || [];
  const focusOptions = useMemo(
    () => buildReadinessFocusOptions(blockers, validationCategories),
    [blockers, validationCategories]
  );
  const visibleBlockers = useMemo(() => filterReadinessItemsByFocus(blockers, focus), [blockers, focus]);
  const visibleValidationCategories = useMemo(
    () => filterReadinessItemsByFocus(validationCategories, focus),
    [validationCategories, focus]
  );
  const exportRows = useMemo(() => buildReadinessExportRows(report), [report]);

  function updateFocus(nextFocus) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextFocus) nextParams.set('focus', nextFocus);
    else nextParams.delete('focus');
    setSearchParams(nextParams, { replace: true });
  }

  function handleExportCsv() {
    if (!exportRows.length) return;
    downloadCsvFile('merxus-production-readiness.csv', exportRows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Readiness</h1>
          <p className="mt-2 text-gray-600">
            Backend readiness for environment configuration, review-provider setup, audit scripts, and deployment validation workflows.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'Pending'}
          </p>
        </div>
        <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${getReadinessToneClasses(report?.status)}`}>
          {String(report?.status || 'ready').toUpperCase()}
        </div>
      </div>

      <SectionCard
        title="Readiness Controls"
        subtitle="Filter the readiness workspace to a specific blocker or validation category and export the current shared backend report."
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex flex-wrap rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => updateFocus('')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                !focus ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            {focusOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateFocus(item.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  focus === item.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Export CSV
          </button>
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
              <p className="mt-4 text-gray-600">Loading production readiness...</p>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && report ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Deploy Blockers"
              value={blockers.length}
              helper="Grouped backend readiness blockers"
            />
            <StatCard
              label="Missing Required Env"
              value={report.env?.missingRequired?.length || 0}
              helper="Hard runtime blockers"
            />
            <StatCard
              label="Missing Audit Scripts"
              value={report.operationalScripts?.missing?.length || 0}
              helper="Operational runbook commands"
            />
            <StatCard
              label="Provider Gaps"
              value={report.reviewProviders?.missingRequiredProviders?.length || 0}
              helper="Review-provider credential setup"
            />
          </div>

          <SectionCard
            title="Runtime Sources"
            subtitle="These paths show what the readiness endpoint was able to load in the current runtime."
          >
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Package Scripts</p>
                <code className="mt-3 block text-xs text-slate-700">{formatRuntimePath(report.runtimeSources?.packageJsonPath)}</code>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Firestore Index Manifest</p>
                <code className="mt-3 block text-xs text-slate-700">{formatRuntimePath(report.runtimeSources?.indexManifestPath)}</code>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Deploy Blockers"
            subtitle="Grouped from the backend readiness report so CLI, admin review, and runbooks stay aligned."
          >
            {visibleBlockers.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleBlockers.map((blocker) => (
                  <div key={blocker.key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-amber-900">{blocker.headline}</p>
                      <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
                        {blocker.count}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1">
                      {(blocker.items || []).map((item) => (
                        <p key={`${blocker.key}-${item}`} className="text-sm text-amber-800">
                          {item}
                        </p>
                      ))}
                    </div>
                    {blocker.actionCommand ? (
                      <code className="mt-4 block rounded-2xl bg-white/70 px-3 py-2 text-xs text-amber-900">
                        {blocker.actionCommand}
                      </code>
                    ) : null}
                    {(blocker.recommendedActions || []).length ? (
                      <div className="mt-4 space-y-1">
                        {blocker.recommendedActions.map((item) => (
                          <p key={`${blocker.key}-action-${item}`} className="text-sm text-amber-800">
                            {item}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {blocker.route ? (
                        <a
                          href={blocker.route}
                          className="inline-flex rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Open Focus
                        </a>
                      ) : null}
                      {blocker.relatedRoute ? (
                        <a
                          href={blocker.relatedRoute}
                          className="inline-flex rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Open Related Context
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No grouped deploy blockers are currently reported.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Operational Commands"
            subtitle="These backend-defined commands should remain part of each staging or production validation pass."
          >
            <div className="space-y-3">
              {(report.operationalAuditCommands || []).map((command) => (
                <code key={command} className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {command}
                </code>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Review Provider Readiness"
            subtitle="Shared provider status from the backend readiness report."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {(report.reviewProviders?.providers || []).map((provider) => (
                <div key={provider.key} className={`rounded-2xl border p-4 ${provider.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <p className="text-sm font-semibold">{provider.label}</p>
                  <p className="mt-2 text-sm">{provider.configured ? 'Configured' : 'Needs credentials'}</p>
                  {(provider.missing || []).length ? (
                    <div className="mt-3 space-y-1">
                      {provider.missing.map((item) => (
                        <p key={`${provider.key}-${item}`} className="text-xs opacity-90">{item}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Manual Validation By Category"
            subtitle="The same backend checklist is grouped here for faster operator review."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleValidationCategories.map((category) => (
                <div key={category.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{category.label}</p>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {category.itemCount || 0}
                    </span>
                  </div>
                  {category.headline ? (
                    <p className="mt-2 text-sm text-slate-600">{category.headline}</p>
                  ) : null}
                  {category.actionCommand ? (
                    <code className="mt-4 block rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      {category.actionCommand}
                    </code>
                  ) : null}
                  {(category.secondaryCommands || []).length ? (
                    <div className="mt-3 space-y-2">
                      {category.secondaryCommands.map((command) => (
                        <code key={`${category.key}-${command}`} className="block rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                          {command}
                        </code>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {(validationByCategory?.[category.key] || []).map((item) => (
                      <p key={`${category.key}-${item}`} className="text-sm text-slate-700">{item}</p>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {category.route ? (
                      <a
                        href={category.route}
                        className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Open Focus
                      </a>
                    ) : null}
                    {category.relatedRoute ? (
                      <a
                        href={category.relatedRoute}
                        className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Open Related Context
                      </a>
                    ) : null}
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
