import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEstateSpeechAnalytics } from '../../api/estate';
import { fetchRestaurantSpeechAnalytics } from '../../api/settings';
import { fetchVoiceSpeechAnalytics } from '../../api/voice';
import {
  buildSpeechOperationsSummary,
  formatLatency,
  getSpeechFilterCount,
  getSpeechRuntimeSettingsPath,
  speechFilterOptions,
} from '../../utils/callSpeech';

function MetricCard({ label, value, helper, tone = 'bg-slate-50 text-slate-900 border-slate-200' }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs opacity-80">{helper}</div>
    </div>
  );
}

const WINDOW_OPTIONS = [7, 30, 90];

const LATENCY_TONES = {
  fast: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  watch: 'bg-amber-50 text-amber-700 border-amber-200',
  slow: 'bg-rose-50 text-rose-700 border-rose-200',
  no_data: 'bg-slate-50 text-slate-700 border-slate-200',
};

function getSpeechAnalyticsClient(tenantType = 'voice') {
  if (tenantType === 'restaurant') {
    return fetchRestaurantSpeechAnalytics;
  }

  if (tenantType === 'real_estate') {
    return fetchEstateSpeechAnalytics;
  }

  return fetchVoiceSpeechAnalytics;
}

export default function SpeechOperationsPanel({
  calls = [],
  filteredCalls = [],
  speechFilter = 'all',
  onSpeechFilterChange,
  tenantType = 'voice',
}) {
  const navigate = useNavigate();
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const localSummary = useMemo(
    () => buildSpeechOperationsSummary(filteredCalls),
    [filteredCalls]
  );
  const summary = analytics?.summary || localSummary;
  const analyticsClient = getSpeechAnalyticsClient(tenantType);

  const topProviders = summary.providerBreakdown.slice(0, 4);
  const settingsPath = getSpeechRuntimeSettingsPath(tenantType);
  const trend = Array.isArray(summary.trend) ? summary.trend.slice(-7) : [];
  const fallbackCount = summary.totals?.fallbackCount ?? summary.fallbackCount ?? 0;
  const healthGatedCount = summary.totals?.healthGatedCount ?? summary.healthGatedCount ?? 0;
  const slowResponseCount = summary.totals?.slowResponseCount ?? summary.slowResponseCount ?? 0;
  const telemetryCalls = summary.totals?.telemetryCalls ?? summary.telemetryCalls ?? 0;

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      try {
        setLoadingAnalytics(true);
        setAnalyticsError('');
        const result = await analyticsClient({ days: analyticsDays });
        if (!active) return;
        setAnalytics(result);
      } catch (error) {
        if (!active) return;
        setAnalyticsError(error?.response?.data?.error || error?.message || 'Failed to load speech analytics');
      } finally {
        if (active) {
          setLoadingAnalytics(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [analyticsClient, analyticsDays]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Speech Operations</h3>
          <p className="mt-1 text-sm text-gray-600">
            Showing {filteredCalls.length} of {calls.length} calls for the selected speech runtime view.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Analytics cards below use the last {analyticsDays} days of tenant call data from the backend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {WINDOW_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setAnalyticsDays(days)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                analyticsDays === days
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {days}d
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate(settingsPath)}
            className="btn-secondary whitespace-nowrap"
          >
            Open Speech Runtime
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {speechFilterOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onSpeechFilterChange(option.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              speechFilter === option.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {option.label} ({getSpeechFilterCount(calls, option.key)})
          </button>
        ))}
      </div>

      {analyticsError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {analyticsError}
        </div>
      ) : null}

      {summary.alerts?.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.alerts.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border px-4 py-3 ${
                alert.severity === 'critical'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{alert.title}</div>
              <div className="mt-2 text-sm">{alert.message}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Fallback Calls"
          value={fallbackCount}
          helper={`${summary.rates?.fallbackRate ?? 0}% of speech-enabled calls in this ${analyticsDays}d window`}
          tone="bg-amber-50 text-amber-900 border-amber-200"
        />
        <MetricCard
          label="Health-Gated"
          value={healthGatedCount}
          helper={`${summary.rates?.healthGateRate ?? 0}% of speech-enabled calls were rerouted before session startup`}
          tone="bg-rose-50 text-rose-900 border-rose-200"
        />
        <MetricCard
          label="Slow Response"
          value={slowResponseCount}
          helper={`${summary.rates?.slowResponseRate ?? 0}% of speech-enabled calls exceeded 5 seconds`}
          tone="bg-orange-50 text-orange-900 border-orange-200"
        />
        <MetricCard
          label="Avg First Response"
          value={formatLatency(summary.averageFirstResponseLatencyMs)}
          helper={`${telemetryCalls} calls in this window include speech telemetry`}
          tone="bg-blue-50 text-blue-900 border-blue-200"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Provider Mix</h4>
              <p className="text-xs text-gray-500">Effective providers in the backend analytics window.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              {summary.providerBreakdown.length} providers
            </span>
          </div>

          {topProviders.length ? (
            <div className="mt-4 space-y-3">
              {topProviders.map((provider) => {
                const totalCalls = summary.totals?.telemetryCalls || summary.telemetryCalls || 0;
                const width = totalCalls ? Math.max((provider.count / totalCalls) * 100, 8) : 0;
                return (
                  <div key={provider.provider}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-900">{provider.provider}</span>
                      <span className="text-gray-500">{provider.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-900"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
              {loadingAnalytics ? 'Loading provider telemetry…' : 'No provider telemetry is available in the selected window.'}
            </div>
          )}

          {summary.fallbackReasons?.length ? (
            <div className="mt-5 border-t border-gray-200 pt-4">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top Fallback Reasons</h5>
              <div className="mt-3 space-y-2">
                {summary.fallbackReasons.slice(0, 4).map((reason) => (
                  <div key={reason.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700">{reason.key}</span>
                    <span className="font-medium text-gray-900">{reason.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900">Latency Bands</h4>
          <p className="text-xs text-gray-500">First assistant response distribution for the backend analytics window.</p>
          <div className="mt-4 space-y-3">
            {summary.latencyBreakdown.map((item) => (
              <div
                key={item.key}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 ${LATENCY_TONES[item.key] || LATENCY_TONES.no_data}`}
              >
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs opacity-80">{item.helper}</div>
                </div>
                <div className="text-lg font-semibold">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Recent Trend</h4>
            <p className="text-xs text-gray-500">Daily speech activity for the last 7 days of the selected analytics window.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
            {analyticsDays}d window
          </span>
        </div>

        {trend.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-7">
            {trend.map((day) => {
              const total = Math.max(day.totalCalls || 0, 1);
              const fallbackHeight = Math.max(((day.fallback || 0) / total) * 100, day.fallback ? 12 : 0);
              const slowHeight = Math.max(((day.slowResponse || 0) / total) * 100, day.slowResponse ? 12 : 0);
              return (
                <div key={day.date} className="rounded-xl bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold text-slate-700">{day.label}</div>
                  <div className="mt-3 flex h-24 items-end gap-2">
                    <div className="flex-1">
                      <div
                        className="w-full rounded-t bg-amber-400"
                        style={{ height: `${fallbackHeight}%` }}
                        title={`Fallback: ${day.fallback || 0}`}
                      />
                    </div>
                    <div className="flex-1">
                      <div
                        className="w-full rounded-t bg-rose-400"
                        style={{ height: `${slowHeight}%` }}
                        title={`Slow response: ${day.slowResponse || 0}`}
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                    <div>Total: {day.totalCalls || 0}</div>
                    <div>Fallback: {day.fallback || 0}</div>
                    <div>Slow: {day.slowResponse || 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
            {loadingAnalytics ? 'Loading trend data…' : 'No speech trend data is available in the selected window.'}
          </div>
        )}
      </div>
    </section>
  );
}
