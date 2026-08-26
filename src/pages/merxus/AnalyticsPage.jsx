import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSystemAnalytics, fetchTenantAnalytics } from '../../api/merxus';
import { useAuth } from '../../context/AuthContext';
import AnalyticsActivityFeedPanel from '../../components/dashboard/AnalyticsActivityFeedPanel';
import {
  SystemCrossTenantComparisonPanel,
  SystemExecutiveSummaryPanel,
  SystemHistoryBucketsPanel,
  SystemReportingNarrativesPanel,
  SystemTenantPressureHistoryPanel,
  SystemRemediationQueuePanel,
} from '../../components/dashboard/SystemCrossTenantPanel';
import { downloadCsvFile } from '../../utils/csv';
import {
  buildAnalyticsHealthPrioritySections,
  getAnalyticsHealthPriorityToneClasses,
} from '../../utils/analyticsOperations';
import { buildOperationsAnalyticsViewModel } from '../../utils/analyticsOperationsGrid';
import { buildTenantFeedbackViewModel } from '../../utils/analyticsTenantFeedback';
import {
  buildAnalyticsExportRows,
  buildAnalyticsOverviewCards,
  labelAnalyticsValue,
} from '../../utils/analyticsWorkspace';

function StatCard({ title, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function MetricRow({ label, value, tone = '' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone || 'bg-slate-100 text-slate-700'}`}>
        {value}
      </span>
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

function TenantCallValueGrid({ value }) {
  if (!value) return null;
  const measured = value.measuredValue || {};
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: measured.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(Number(measured.amount || 0));

  return (
    <SectionCard
      title="AI Call Outcomes"
      subtitle="Versioned call outcomes only. Booking counts require an authoritative transaction record; monetary value includes only explicit stored values."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="AI Resolution" value={`${value.aiResolutionRate || 0}%`} helper={`${value.resolvedByAi || 0} of ${value.totalCalls || 0} normalized calls`} />
        <StatCard title="Human Transfers" value={value.transferredToHuman || 0} helper={`${value.callbacksRequested || 0} callback fallback(s)`} />
        <StatCard title="Authoritative Bookings" value={value.authoritativeBookings || 0} helper="Confirmed by a stored transaction ID and completed state" />
        <StatCard title="Measured Value" value={formattedValue} helper={`${measured.callCount || 0} call(s) with explicit value`} />
        <StatCard title="High-intent Leads" value={value.highIntentLeads || 0} helper="Deterministic appointment, quote, showing, order, or reservation intent" />
        <StatCard title="Bilingual Calls" value={value.bilingualCalls || 0} helper="Calls with a recorded language switch" />
        <StatCard title="Messages Taken" value={value.messagesTaken || 0} helper={`${value.failedOrAbandoned || 0} failed or abandoned`} />
        <StatCard title="Value Not Measured" value={value.unmeasuredValueCallCount || 0} helper="Excluded from the monetary total" />
      </div>
      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {value.valueDisclosure}
      </p>
    </SectionCard>
  );
}

function TrendBars({ title, items = [], metricKey, colorClass = 'bg-emerald-500', helper }) {
  const maxValue = Math.max(...items.map((item) => Number(item?.[metricKey] || 0)), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
        {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
      </div>
      {items.length ? (
        <div className="mt-4 flex items-end gap-2">
          {items.map((item) => {
            const value = Number(item?.[metricKey] || 0);
            const height = maxValue > 0 ? Math.max(16, Math.round((value / maxValue) * 88)) : 16;
            return (
              <div key={`${metricKey}-${item.date}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-24 w-full items-end rounded-2xl bg-slate-100 px-1.5 py-1.5">
                  <div className={`w-full rounded-xl ${colorClass}`} style={{ height }} />
                </div>
                <span className="text-xs font-semibold text-slate-700">{value}</span>
                <span className="text-[11px] text-slate-500">{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No recent trend data available yet.</p>
      )}
    </div>
  );
}

function OperationsGrid({ operations = {} }) {
  const model = buildOperationsAnalyticsViewModel(operations, 30);
  const readiness = model.readiness;
  const reviewSync = model.reviewSync;
  const push = model.push;
  const alerts = model.alerts;
  const notificationRuns = model.notificationRuns;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Production Readiness"
        subtitle="Shared deploy blockers, runtime gaps, and manual validation categories from the existing backend readiness report."
      >
        {readiness ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {readiness.cards.map((card) => (
                <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
              ))}
            </div>
            {readiness.blockers.length ? (
              <div className="space-y-2">
                {readiness.blockers.map((blocker) => (
                  <MetricRow
                    key={blocker.key}
                    label={blocker.label}
                    value={blocker.value}
                    tone={blocker.tone}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No deploy blockers are active in the current readiness snapshot.</p>
            )}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">Runtime sources</p>
              <p className="mt-2">
                Package scripts: {readiness.runtimeSources.packageJsonPath}
              </p>
              <p className="mt-1">
                Firestore indexes: {readiness.runtimeSources.indexManifestPath}
              </p>
              <a
                href="/merxus/production-readiness"
                className="mt-4 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open Readiness Workspace
              </a>
            </div>
            {readiness.operationalAuditCommands.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operational Audit Commands</p>
                <div className="mt-3 space-y-2">
                  {readiness.operationalAuditCommands.map((command) => (
                    <div key={command} className="rounded-2xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                      {command}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">No production-readiness data available yet.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Review Sync"
        subtitle="Provider sync health, retries, and recent platform failures from the existing review import loop."
      >
        {reviewSync ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {reviewSync.cards.map((card) => (
                <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
              ))}
            </div>
            <div className="space-y-2">
              {reviewSync.byPlatformRows.map((item) => (
                <MetricRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
            {reviewSync.recentFailure ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">{reviewSync.recentFailure.title}</p>
                <p className="mt-2">{reviewSync.recentFailure.description}</p>
                <p className="mt-2 text-xs text-red-600">{reviewSync.recentFailure.timestamp}</p>
              </div>
            ) : null}
            {reviewSync.retryMonitoring ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Retry monitoring</p>
                <p className="mt-2">{reviewSync.retryMonitoring.description}</p>
                <p className="mt-2 text-xs text-amber-700">{reviewSync.retryMonitoring.helper}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">No review sync analytics available yet.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Push Health"
        subtitle="Expo receipt health, invalid-token trends, and delivery-category reliability from the existing push receipt ledger."
      >
        {push ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {push.cards.map((card) => (
                <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
              ))}
            </div>
            <div className="space-y-2">
              {push.byCategoryRows.map((item) => (
                <MetricRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
            {push.topError ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold">Top receipt error</p>
                <p className="mt-2">{push.topError.error}</p>
                <p className="mt-1 text-xs text-slate-500">{push.topError.count} occurrence(s)</p>
              </div>
            ) : null}
            {push.cleanupMonitoring ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Cleanup monitoring</p>
                <p className="mt-2">{push.cleanupMonitoring.description}</p>
                <p className="mt-2 text-xs text-amber-700">Threshold flags: {push.cleanupMonitoring.helper}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">No push receipt health data available yet.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Automation Alerts"
        subtitle="Ownership, severity, and remediation pressure across the existing `notification_run_alerts` ledger."
      >
        {alerts ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {alerts.cards.map((card) => (
                <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
              ))}
            </div>
            <div className="space-y-2">
              {alerts.jobTypeRows.map((item) => (
                <MetricRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No automation alert analytics available yet.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Scheduler Health"
        subtitle="Notification automation job-run reliability across daily digests, retries, escalations, and related scheduled work."
      >
        {notificationRuns ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {notificationRuns.cards.map((card) => (
                <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
              ))}
            </div>
            <div className="space-y-2">
              {notificationRuns.jobTypeRows.map((item) => (
                <MetricRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
            {notificationRuns.recentFailure ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">{notificationRuns.recentFailure.title}</p>
                <p className="mt-2">{notificationRuns.recentFailure.description}</p>
                <p className="mt-2 text-xs text-red-600">{notificationRuns.recentFailure.timestamp}</p>
              </div>
            ) : null}
            {notificationRuns.backpressure ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Backpressure monitoring</p>
                <p className="mt-2">{notificationRuns.backpressure.description}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">No scheduler-run analytics available yet.</p>
        )}
      </SectionCard>
    </div>
  );
}

function HealthPriorities({ operations = {} }) {
  const sections = buildAnalyticsHealthPrioritySections(operations);

  if (!sections.length) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {sections.map((section) => (
        <SectionCard
          key={section.key}
          title={section.title}
          subtitle="Severity and operator guidance derived from the live analytics payload."
        >
          <div className={`rounded-2xl border p-4 ${getAnalyticsHealthPriorityToneClasses(section.health?.severity)}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{section.health?.headline || 'Healthy'}</p>
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {section.health?.severity || 'healthy'}
              </span>
            </div>
            <p className="mt-3 text-sm">{section.health?.remediationHint || 'No remediation guidance is available yet.'}</p>
            <p className="mt-3 text-xs opacity-80">
              Attention signals: {section.health?.attentionRequired || 0}
            </p>
            {section.detailLine ? <p className="mt-2 text-xs opacity-80">{section.detailLine}</p> : null}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function OperationsTrendGrid({ operations = {}, windowDays = 30 }) {
  const trends = buildOperationsAnalyticsViewModel(operations, windowDays).trends;
  const displayItems = trends.displayItems;

  if (!displayItems.length) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Operational Trend"
        subtitle="Success vs attention signals across review sync, scheduler runs, push delivery, and critical alerts."
      >
        <div className="grid gap-4">
          <TrendBars
            title="Success Signals"
            items={displayItems}
            metricKey="successSignals"
            helper={trends.successHelper}
          />
          <TrendBars
            title="Attention Signals"
            items={displayItems}
            metricKey="attentionSignals"
            colorClass="bg-rose-500"
            helper={trends.attentionHelper}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Failure Pressure"
        subtitle="Push failures and critical alerts grouped into the same selected window."
      >
        <div className="grid gap-4">
          <TrendBars
            title="Push Failures"
            items={displayItems}
            metricKey="pushFailed"
            colorClass="bg-amber-500"
            helper={trends.pushHelper}
          />
          <TrendBars
            title="Critical Alerts"
            items={displayItems}
            metricKey="criticalAlerts"
            colorClass="bg-red-500"
            helper={trends.criticalHelper}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function TenantFeedbackGrid({ feedback }) {
  if (!feedback) return null;

  const model = buildTenantFeedbackViewModel(feedback);
  const trendDaily = model.trendDaily;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Feedback Funnel"
        subtitle="30-day request, response, and public-review conversion metrics from the existing feedback workflow."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {model.funnelCards.map((card) => (
            <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Reputation Mix"
        subtitle="Platform mix, sentiment distribution, and reply-state breakdown across imported public reviews."
      >
        <div className="space-y-2">
          {model.reputationRows.map((item) => (
            <MetricRow key={item.key} label={item.label} value={item.value} />
          ))}
        </div>
        {model.sentimentRows.length ? (
          <div className="mt-4 space-y-2">
            {model.sentimentRows.map((item) => (
              <MetricRow key={item.key} label={item.label} value={item.value} />
            ))}
          </div>
        ) : null}
        {model.replyStateRows.length ? (
          <div className="mt-4 space-y-2">
            {model.replyStateRows.map((item) => (
              <MetricRow key={item.key} label={item.label} value={item.value} />
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Recent Trends"
        subtitle="Seven-day flow from private feedback requests into public reviews and recovery resolution."
      >
        <div className="grid gap-4">
          <TrendBars
            title="Requests"
            items={trendDaily}
            metricKey="requestsSent"
            helper={`${model.trendDays}-day`}
          />
          <TrendBars
            title="Public Reviews"
            items={trendDaily}
            metricKey="publicReviews"
            colorClass="bg-sky-500"
            helper={`${feedback.reviews?.total || 0} total`}
          />
          <TrendBars
            title="Resolved Recoveries"
            items={trendDaily}
            metricKey="resolvedRecoveries"
            colorClass="bg-amber-500"
            helper={`${feedback.recovery?.resolved || 0} resolved`}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Reply Workflow"
        subtitle="How approved, posted, failed, and draft replies are moving through the current public-review workflow."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {model.replyWorkflowCards.map((card) => (
            <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Source Attribution"
        subtitle="Which existing intake paths are producing feedback requests and low-rating recovery volume."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Requests By Source</p>
            {model.sourceGroups.requests.length ? (
              model.sourceGroups.requests.map((item) => (
                <MetricRow key={item.key} label={item.label} value={item.value} />
              ))
            ) : (
              <p className="text-sm text-slate-500">No request attribution available yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Low Ratings By Source</p>
            {model.sourceGroups.lowRatings.length ? (
              model.sourceGroups.lowRatings.map((item) => (
                <MetricRow key={item.key} label={item.label} value={item.value} />
              ))
            ) : (
              <p className="text-sm text-slate-500">No low-rating attribution available yet.</p>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default function AnalyticsPage() {
  const { userClaims } = useAuth();
  const [searchParams] = useSearchParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTenantAnalytics, setIsTenantAnalytics] = useState(false);
  const [windowDays, setWindowDays] = useState(30);
  const selectedFocus = searchParams.get('focus') || 'all';

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (userClaims?.role !== 'merxus_admin' && userClaims?.role !== 'merxus_support' && userClaims?.role !== 'super_admin') {
          try {
            const data = await fetchTenantAnalytics({ days: windowDays, trendDays: windowDays });
            setAnalytics(data);
            setIsTenantAnalytics(true);
          } catch (err) {
            console.warn('Tenant analytics not available, falling back to system analytics:', err);
            const data = await fetchSystemAnalytics({ days: windowDays, trendDays: windowDays });
            setAnalytics(data);
            setIsTenantAnalytics(false);
          }
        } else {
          const data = await fetchSystemAnalytics({ days: windowDays, trendDays: windowDays });
          setAnalytics(data);
          setIsTenantAnalytics(false);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userClaims, windowDays]);

  const overviewCards = useMemo(
    () => buildAnalyticsOverviewCards({ analytics, isTenantAnalytics }),
    [analytics, isTenantAnalytics]
  );

  const exportRows = useMemo(
    () => buildAnalyticsExportRows({ analytics, isTenantAnalytics, windowDays }),
    [analytics, isTenantAnalytics, windowDays]
  );

  function handleExportCsv() {
    if (!exportRows.length) return;
    const filename = isTenantAnalytics
      ? `merxus-${analytics?.tenantType || 'tenant'}-analytics-${windowDays}d.csv`
      : `merxus-system-analytics-${windowDays}d.csv`;
    downloadCsvFile(filename, exportRows);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isTenantAnalytics ? `${labelAnalyticsValue(analytics?.tenantType || 'tenant')} Analytics` : 'System Analytics'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isTenantAnalytics
            ? 'Operational review, feedback, push, and automation health for your workspace.'
            : 'System-wide operational health across tenants, review sync, push delivery, and automation jobs.'}
        </p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Reporting Window</h2>
            <p className="mt-1 text-sm text-slate-600">Switch between short-term operations and longer-range owner reporting without leaving the live analytics surface.</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Export CSV
            </button>
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              {[7, 30, 90].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWindowDays(value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    windowDays === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} />
        ))}
      </div>

      {isTenantAnalytics ? <TenantFeedbackGrid feedback={analytics?.feedback} /> : null}

      {isTenantAnalytics ? <TenantCallValueGrid value={analytics?.callValue} /> : null}

      {!isTenantAnalytics ? (
        <>
          <SystemExecutiveSummaryPanel crossTenant={analytics?.crossTenant} />
          <SystemCrossTenantComparisonPanel
            crossTenant={analytics?.crossTenant}
            selectedFocus={selectedFocus}
          />
          <SystemTenantPressureHistoryPanel
            crossTenant={analytics?.crossTenant}
            selectedFocus={selectedFocus}
          />
          <SystemRemediationQueuePanel
            crossTenant={analytics?.crossTenant}
            selectedFocus={selectedFocus}
          />
        </>
      ) : null}

      {!isTenantAnalytics ? (
        <SystemReportingNarrativesPanel reporting={analytics?.reporting} />
      ) : null}

      {!isTenantAnalytics ? (
        <SystemHistoryBucketsPanel reporting={analytics?.reporting} windowDays={windowDays} />
      ) : null}

      <HealthPriorities operations={analytics?.operations} />

      <OperationsTrendGrid operations={analytics?.operations} windowDays={windowDays} />

      <OperationsGrid operations={analytics?.operations} />

      <AnalyticsActivityFeedPanel
        analytics={analytics}
        title="Recent Activity"
        subtitle="The most recent tenant, scheduler, and remediation activity flowing through the existing analytics payload."
        emptyCopy="No recent analytics activity has been recorded yet."
      />
    </div>
  );
}
