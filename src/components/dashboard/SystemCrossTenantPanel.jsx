import {
  buildCrossTenantFocusOptions,
  filterCrossTenantItems,
  filterCrossTenantQueue,
  getCrossTenantBadgeClasses,
  getCrossTenantToneClasses,
  getCrossTenantTopIssueLabel,
  getNarrativeToneClasses,
} from '../../utils/systemCrossTenant';

function StatCard({ title, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function ActionLink({ href, label }) {
  if (!href) return null;

  return (
    <a
      href={href}
      className="inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </a>
  );
}

function ExecutiveFocusCard({ title, item, helperBuilder }) {
  if (!item) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-lg font-semibold text-slate-900">{item.label}</p>
      <p className="mt-2 text-sm text-slate-600">{helperBuilder(item)}</p>
      {item.route ? (
        <a
          href={item.route}
          className="mt-4 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Open Focus
        </a>
      ) : null}
    </div>
  );
}

export function SystemExecutiveSummaryPanel({ crossTenant }) {
  const executive = crossTenant?.executive || null;
  if (!executive) return null;

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Executive Rollup</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cross-tenant operating context built from the same live system analytics payload already powering the admin dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tenant Accounts"
          value={executive.totalAccounts || 0}
          helper="Restaurant, voice, and real-estate accounts in the current footprint."
        />
        <StatCard
          title="Attention Load"
          value={executive.totalAttentionSignals || 0}
          helper="Combined sync, push, scheduler, and alert pressure signals."
        />
        <ExecutiveFocusCard
          title="Recommended Focus"
          item={executive.recommendedFocus}
          helperBuilder={(item) => `${item.attentionSignals || 0} active signals. ${item.remediationHint || "Open analytics for remediation details."}`}
        />
        <ExecutiveFocusCard
          title="Healthiest Segment"
          item={executive.healthiestTenantType}
          helperBuilder={(item) => `${item.pushDeliveryRate || 0}% push delivery and ${item.reviewSyncSuccessRate || 0}% review-sync success.`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ExecutiveFocusCard
          title="Largest Segment"
          item={executive.largestTenantType}
          helperBuilder={(item) => `${item.accounts || 0} accounts, ${item.accountShareRate || 0}% of the current tenant base.`}
        />
        {executive.recommendedFocus ? (
          <div className={`rounded-2xl border p-4 ${getCrossTenantToneClasses(executive.recommendedFocus.severity)}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Operator Guidance</p>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {executive.recommendedFocus.severity || "healthy"}
              </span>
            </div>
            <p className="mt-3 text-sm">{executive.recommendedFocus.headline}</p>
            <p className="mt-2 text-sm opacity-90">{executive.recommendedFocus.remediationHint}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SystemReportingNarrativesPanel({ reporting }) {
  const storylines = reporting?.storylines || [];
  if (!storylines.length) return null;

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Reporting Narratives</h2>
        <p className="mt-1 text-sm text-slate-600">
          Narrative operating context generated from the same live analytics payload already powering the Merxus admin views.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {storylines.map((item) => (
          <div key={item.key} className={`rounded-3xl border p-5 ${getNarrativeToneClasses(item.tone)}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold">{item.title || "Operational storyline"}</p>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {item.tone || "neutral"}
              </span>
            </div>
            <p className="mt-3 text-sm opacity-90">{item.description}</p>
            {item.route ? (
              <a
                href={item.route}
                className="mt-4 inline-flex rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-current transition hover:bg-white"
              >
                Open Context
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemHistoryBucketsPanel({ reporting, windowDays = 30 }) {
  const history = reporting?.history || null;
  const weekly = history?.weekly || [];
  if (!weekly.length) return null;

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">History View</h2>
        <p className="mt-1 text-sm text-slate-600">
          Grouped recent operating history derived from the live trend series, without introducing a separate reporting stack.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Reporting Window"
          value={`${windowDays}d`}
          helper="Current system dashboard reporting span."
        />
        <StatCard
          title="Strongest Period"
          value={history?.strongestPeriod?.label || "—"}
          helper={
            history?.strongestPeriod
              ? `${history.strongestPeriod.successSignals || 0} success signals`
              : "No grouped history yet"
          }
        />
        <StatCard
          title="Riskiest Period"
          value={history?.riskiestPeriod?.label || "—"}
          helper={
            history?.riskiestPeriod
              ? `${history.riskiestPeriod.attentionSignals || 0} attention signals`
              : "No elevated pressure yet"
          }
        />
        <StatCard
          title="History Buckets"
          value={weekly.length}
          helper="Weekly-style grouped buckets from the trend feed."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {weekly.map((item) => (
          <div key={item.key} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCrossTenantBadgeClasses(
                (item.attentionSignals || 0) > 0 ? "warning" : "healthy"
              )}`}>
                {item.attentionSignals || 0} signals
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard title="Success Signals" value={item.successSignals || 0} helper="Positive operating markers" />
              <StatCard title="Push Failures" value={item.pushFailures || 0} helper="Receipt or delivery failures" />
              <StatCard title="Critical Alerts" value={item.criticalAlerts || 0} helper="Open critical automation alerts" />
              <StatCard title="Scheduler Failures" value={item.schedulerFailures || 0} helper="Failed scheduled runs in bucket" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemCrossTenantComparisonPanel({
  crossTenant,
  selectedFocus = "all",
}) {
  const items = crossTenant?.byTenantType || [];
  const visibleItems = filterCrossTenantItems(items, selectedFocus);
  const focusOptions = buildCrossTenantFocusOptions(selectedFocus);

  if (!items.length) return null;

  return (
    <div className="card space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cross-Tenant Breakdown</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compare attention load, review-sync reliability, push delivery, and scheduler pressure across the three tenant types.
          </p>
        </div>
        <div className="inline-flex flex-wrap rounded-2xl bg-slate-100 p-1">
          {focusOptions.map((option) => (
            <a
              key={option.key}
              href={option.href}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                option.selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <div key={item.tenantType} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{item.accounts || 0}</p>
                <p className="mt-1 text-sm text-slate-500">Tenant accounts in this segment</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCrossTenantBadgeClasses(item.severity)}`}>
                {item.attentionSignals || 0} signals
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard title="Review Sync" value={`${item.reviewSyncSuccessRate || 0}%`} helper={`${item.reviewSyncAttention || 0} attention signal(s)`} />
              <StatCard title="Push Delivery" value={`${item.pushDeliveryRate || 0}%`} helper={`${item.pushInvalidTokens || 0} invalid tokens`} />
              <StatCard title="Active Alerts" value={item.activeAlerts || 0} helper={`${item.criticalAlerts || 0} critical`} />
              <StatCard title="Scheduler Failures" value={item.schedulerFailures || 0} helper="Failed scheduled notification runs in window" />
            </div>

            {item.trend?.highestAttentionDay || item.trend?.strongestDay ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatCard
                  title="Peak Pressure Day"
                  value={item.trend?.highestAttentionDay?.label || "—"}
                  helper={
                    item.trend?.highestAttentionDay
                      ? `${item.trend.highestAttentionDay.attentionSignals || 0} attention signals`
                      : "No elevated pressure in this reporting window"
                  }
                />
                <StatCard
                  title="Strongest Day"
                  value={item.trend?.strongestDay?.label || "—"}
                  helper={
                    item.trend?.strongestDay
                      ? `${item.trend.strongestDay.successSignals || 0} success signals`
                      : "No stronger day has been recorded yet"
                  }
                />
              </div>
            ) : null}

            {(item.pressureSources || []).length ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pressure Sources</p>
                {(item.pressureSources || []).map((source) => (
                  <div key={source.key} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{source.label}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCrossTenantBadgeClasses(source.severity)}`}>
                        {source.value || 0}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{source.helper}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {item.topIssue ? (
              <div className={`mt-5 rounded-2xl border p-4 ${getCrossTenantToneClasses(item.topIssue.severity)}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Top Issue</p>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                    {item.topIssue.severity || "healthy"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold">{item.topIssue.headline}</p>
                <p className="mt-2 text-sm opacity-90">{item.topIssue.remediationHint}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={item.route}
                    className="inline-flex rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-current transition hover:bg-white"
                  >
                    Open Segment
                  </a>
                  <a
                    href={item.opsAuditRoute || "/merxus/ops-audit"}
                    className="inline-flex rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-current transition hover:bg-white"
                  >
                    Open Ops Audit
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemRemediationQueuePanel({
  crossTenant,
  selectedFocus = "all",
}) {
  const queue = filterCrossTenantQueue(crossTenant?.remediationQueue || [], selectedFocus);

  if (!queue.length) return null;

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Remediation Queue</h2>
        <p className="mt-1 text-sm text-slate-600">
          The highest-priority tenant-type issues to route through the existing analytics and remediation surfaces.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {queue.map((item) => (
          <div key={item.tenantType} className={`rounded-3xl border p-5 ${getCrossTenantToneClasses(item.severity)}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {item.label}
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {item.severity}
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold">{item.headline}</p>
            <p className="mt-2 text-sm opacity-90">{item.remediationHint}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-white/80 px-2.5 py-1">
                {item.attentionSignals || 0} signals
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1">
                {item.metrics?.activeAlerts || 0} alerts
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1">
                {item.metrics?.reviewSyncAttention || 0} sync issues
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1">
                {item.metrics?.schedulerFailures || 0} scheduler failures
              </span>
            </div>
            {item.peakAttentionDay ? (
              <p className="mt-4 text-sm opacity-90">
                Peak pressure day: {item.peakAttentionDay.label} with {item.peakAttentionDay.attentionSignals || 0} active signals.
              </p>
            ) : null}
            {(item.reasons || []).length ? (
              <div className="mt-4 space-y-2">
                {(item.reasons || []).map((reason) => (
                  <div key={reason.key} className="rounded-2xl bg-white/70 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{reason.label}</p>
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                        {reason.value || 0}
                      </span>
                    </div>
                    <p className="mt-2 opacity-90">{reason.helper}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={item.route}
                className="inline-flex rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-current transition hover:bg-white"
              >
                Open Remediation
              </a>
              <a
                href={item.opsAuditRoute || "/merxus/ops-audit"}
                className="inline-flex rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-current transition hover:bg-white"
              >
                Open Ops Audit
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemTenantPressureHistoryPanel({
  crossTenant,
  selectedFocus = "all",
}) {
  const items = filterCrossTenantItems(crossTenant?.byTenantType || [], selectedFocus);

  if (!items.length) return null;

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Tenant-Type History</h2>
        <p className="mt-1 text-sm text-slate-600">
          Deeper tenant-type operating context from the same live cross-tenant analytics payload, including peak pressure timing and strongest recent periods.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.tenantType} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCrossTenantBadgeClasses(item.severity)}`}>
                {item.attentionSignals || 0} signals
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard
                title="Peak Pressure"
                value={item.trend?.highestAttentionDay?.label || "—"}
                helper={
                  item.trend?.highestAttentionDay
                    ? `${item.trend.highestAttentionDay.attentionSignals || 0} attention signals`
                    : "No elevated pressure in the recent window"
                }
              />
              <StatCard
                title="Strongest Day"
                value={item.trend?.strongestDay?.label || "—"}
                helper={
                  item.trend?.strongestDay
                    ? `${item.trend.strongestDay.successSignals || 0} success signals`
                    : "No stronger day recorded in the recent window"
                }
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard
                title="Window Totals"
                value={item.trend?.days ? `${item.trend.days}d` : "—"}
                helper={`${item.trend?.totals?.attentionSignals || 0} attention • ${item.trend?.totals?.successSignals || 0} success`}
              />
              <StatCard
                title="Top Issue"
                value={getCrossTenantTopIssueLabel(item.topIssue)}
                helper={item.topIssue?.headline || "No top issue is active right now"}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <ActionLink href={item.route} label="Open Analytics" />
              <ActionLink href={item.opsAuditRoute} label="Open Ops Audit" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
