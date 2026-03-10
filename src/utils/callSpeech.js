export const SLOW_RESPONSE_THRESHOLD_MS = 5000;
const FAST_RESPONSE_THRESHOLD_MS = 2000;

export const speechFilterOptions = [
  { key: 'all', label: 'All Calls' },
  { key: 'fallback', label: 'Fallback' },
  { key: 'health_gated', label: 'Health Gate' },
  { key: 'standard', label: 'Standard' },
  { key: 'realtime', label: 'Realtime' },
  { key: 'slow_response', label: 'Slow Response' },
];

export function matchesSpeechFilter(call, filter) {
  if (!filter || filter === 'all') {
    return true;
  }

  const speech = call?.speechSession;
  if (!speech) {
    return false;
  }

  switch (filter) {
    case 'fallback':
      return Boolean(speech.fallbackTriggered);
    case 'health_gated':
      return Boolean(speech.healthGated);
    case 'standard':
      return speech.effectiveStrategy === 'standard';
    case 'realtime':
      return (
        speech.effectiveStrategy === 'realtime' &&
        !speech.fallbackTriggered &&
        !speech.healthGated
      );
    case 'slow_response':
      return Number(speech?.metrics?.firstResponseLatencyMs) >= SLOW_RESPONSE_THRESHOLD_MS;
    default:
      return true;
  }
}

export function getSpeechFilterCount(calls, filter) {
  if (!Array.isArray(calls) || !calls.length) {
    return 0;
  }

  return calls.filter((call) => matchesSpeechFilter(call, filter)).length;
}

export function getSpeechRuntimeSettingsPath(tenantType = 'voice') {
  if (tenantType === 'restaurant') {
    return '/restaurant/settings?tab=ai&panel=speech-runtime';
  }

  if (tenantType === 'real_estate') {
    return '/estate/settings?tab=ai&panel=speech-runtime';
  }

  return '/voice/settings?tab=ai&panel=speech-runtime';
}

export function formatLatency(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '—';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

export function getSpeechProviderName(call) {
  const speech = call?.speechSession;
  if (!speech) {
    return 'No telemetry';
  }

  return speech.effectiveProvider || speech.realtimeProvider || 'Unknown provider';
}

function getLatencyBand(call) {
  const latencyMs = Number(call?.speechSession?.metrics?.firstResponseLatencyMs);

  if (!Number.isFinite(latencyMs) || latencyMs <= 0) {
    return 'no_data';
  }

  if (latencyMs >= SLOW_RESPONSE_THRESHOLD_MS) {
    return 'slow';
  }

  if (latencyMs >= FAST_RESPONSE_THRESHOLD_MS) {
    return 'watch';
  }

  return 'fast';
}

export function buildSpeechOperationsSummary(calls = []) {
  const summary = {
    totalCalls: calls.length,
    telemetryCalls: 0,
    fallbackCount: 0,
    healthGatedCount: 0,
    standardCount: 0,
    realtimeCount: 0,
    slowResponseCount: 0,
    averageFirstResponseLatencyMs: null,
    providerBreakdown: [],
    latencyBreakdown: [
      { key: 'fast', label: 'Fast', helper: '< 2s', count: 0, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { key: 'watch', label: 'Watch', helper: '2s - 5s', count: 0, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
      { key: 'slow', label: 'Slow', helper: '5s+', count: 0, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
      { key: 'no_data', label: 'No Data', helper: 'No latency', count: 0, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
    ],
  };

  const providerCounts = new Map();
  const latencies = [];

  calls.forEach((call) => {
    const speech = call?.speechSession;
    if (!speech) {
      summary.latencyBreakdown.find((item) => item.key === 'no_data').count += 1;
      return;
    }

    summary.telemetryCalls += 1;

    if (speech.fallbackTriggered) {
      summary.fallbackCount += 1;
    }

    if (speech.healthGated) {
      summary.healthGatedCount += 1;
    }

    if (speech.effectiveStrategy === 'standard') {
      summary.standardCount += 1;
    } else if (speech.effectiveStrategy === 'realtime') {
      summary.realtimeCount += 1;
    }

    const latencyMs = Number(speech?.metrics?.firstResponseLatencyMs);
    if (Number.isFinite(latencyMs) && latencyMs > 0) {
      latencies.push(latencyMs);
      if (latencyMs >= SLOW_RESPONSE_THRESHOLD_MS) {
        summary.slowResponseCount += 1;
      }
    }

    const providerName = getSpeechProviderName(call);
    providerCounts.set(providerName, (providerCounts.get(providerName) || 0) + 1);

    const band = getLatencyBand(call);
    const bucket = summary.latencyBreakdown.find((item) => item.key === band);
    if (bucket) {
      bucket.count += 1;
    }
  });

  if (latencies.length) {
    const totalLatency = latencies.reduce((sum, value) => sum + value, 0);
    summary.averageFirstResponseLatencyMs = totalLatency / latencies.length;
  }

  summary.providerBreakdown = Array.from(providerCounts.entries())
    .map(([provider, count]) => ({ provider, count }))
    .sort((left, right) => right.count - left.count);

  return summary;
}
