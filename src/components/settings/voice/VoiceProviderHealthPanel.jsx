import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchVoiceProviderHealth,
  invalidateVoiceProviderHealthCache,
} from '../../../api/voice';
import {
  fetchRestaurantProviderHealth,
  invalidateRestaurantProviderHealthCache,
} from '../../../api/settings';
import {
  fetchEstateProviderHealth,
  invalidateEstateProviderHealthCache,
} from '../../../api/estate';

function buildSpeechForm(settings = {}) {
  const speech = settings?.speech || settings?.voiceProviders || {};
  const realtime = speech?.realtime || {};
  const pipeline = speech?.pipeline || {};

  return {
    strategy: speech?.strategy || 'realtime',
    allowFallback: speech?.allowFallback !== false,
    healthGatingEnabled: Boolean(speech?.healthGatingEnabled),
    realtimeProvider: realtime?.provider || speech?.realtimeProvider || 'openai_realtime',
    realtimeModel: realtime?.model || '',
    sttProvider: pipeline?.sttProvider || speech?.sttProvider || 'openai_managed',
    ttsProvider: pipeline?.ttsProvider || speech?.ttsProvider || 'openai_managed',
  };
}

function formatTimestamp(value) {
  if (!value) return 'Never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Never';
  return parsed.toLocaleString();
}

function statusClasses(ok) {
  return ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';
}

function getTenantHealthClients(tenantType = 'voice') {
  if (tenantType === 'restaurant') {
    return {
      fetchHealth: fetchRestaurantProviderHealth,
      invalidateHealth: invalidateRestaurantProviderHealthCache,
    };
  }

  if (tenantType === 'real_estate') {
    return {
      fetchHealth: fetchEstateProviderHealth,
      invalidateHealth: invalidateEstateProviderHealthCache,
    };
  }

  return {
    fetchHealth: fetchVoiceProviderHealth,
    invalidateHealth: invalidateVoiceProviderHealthCache,
  };
}

export default function VoiceProviderHealthPanel({
  settings,
  onSave,
  saving,
  highlighted = false,
  tenantType = 'voice',
}) {
  const [form, setForm] = useState(() => buildSpeechForm(settings));
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const sectionRef = useRef(null);
  const healthClients = getTenantHealthClients(tenantType);

  useEffect(() => {
    setForm(buildSpeechForm(settings));
  }, [settings]);

  useEffect(() => {
    loadHealth(false);
  }, [tenantType]);

  useEffect(() => {
    if (!highlighted) return;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlighted]);

  async function loadHealth(refresh = false) {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const result = await healthClients.fetchHealth({ refresh });
      setHealth(result);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load provider health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleClearCache() {
    try {
      setClearing(true);
      await healthClients.invalidateHealth();
      toast.success('Provider health cache cleared');
      await loadHealth(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to clear provider cache');
    } finally {
      setClearing(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      speech: {
        strategy: form.strategy,
        allowFallback: form.allowFallback,
        healthGatingEnabled: form.healthGatingEnabled,
        realtimeProvider: form.realtimeProvider,
        sttProvider: form.sttProvider,
        ttsProvider: form.ttsProvider,
        realtime: {
          provider: form.realtimeProvider,
          ...(form.realtimeModel ? { model: form.realtimeModel } : {}),
        },
        pipeline: {
          sttProvider: form.sttProvider,
          ttsProvider: form.ttsProvider,
        },
      },
    });
  }

  return (
    <section
      ref={sectionRef}
      id="speech-runtime-panel"
      className={`card scroll-mt-24 ${highlighted ? 'ring-2 ring-primary-300 ring-offset-2' : ''}`}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Speech Runtime</h3>
          <p className="text-sm text-gray-600">
            Control strategy selection, provider fallback, and inspect live provider health.
          </p>
          {highlighted ? (
            <p className="mt-2 text-xs font-medium text-primary-700">
              Opened from Notification Center for speech-health remediation.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadHealth(true)}
            className="btn-secondary"
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Checks'}
          </button>
          <button
            type="button"
            onClick={handleClearCache}
            className="btn-secondary"
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : 'Clear Cache'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="strategy" className="block text-sm font-medium text-gray-700 mb-2">
              Strategy
            </label>
            <select
              id="strategy"
              name="strategy"
              value={form.strategy}
              onChange={handleChange}
              className="input-field"
            >
              <option value="realtime">Realtime</option>
              <option value="standard">Standard Pipeline</option>
            </select>
          </div>

          <div>
            <label htmlFor="realtimeProvider" className="block text-sm font-medium text-gray-700 mb-2">
              Realtime Provider
            </label>
            <select
              id="realtimeProvider"
              name="realtimeProvider"
              value={form.realtimeProvider}
              onChange={handleChange}
              className="input-field"
            >
              <option value="openai_realtime">OpenAI Realtime</option>
              <option value="mock_realtime">Mock Realtime</option>
            </select>
          </div>

          <div>
            <label htmlFor="sttProvider" className="block text-sm font-medium text-gray-700 mb-2">
              STT Provider
            </label>
            <select
              id="sttProvider"
              name="sttProvider"
              value={form.sttProvider}
              onChange={handleChange}
              className="input-field"
            >
              <option value="openai_managed">OpenAI Managed</option>
              <option value="openai_stt">OpenAI STT</option>
              <option value="mock_stt">Mock STT</option>
            </select>
          </div>

          <div>
            <label htmlFor="ttsProvider" className="block text-sm font-medium text-gray-700 mb-2">
              TTS Provider
            </label>
            <select
              id="ttsProvider"
              name="ttsProvider"
              value={form.ttsProvider}
              onChange={handleChange}
              className="input-field"
            >
              <option value="openai_managed">OpenAI Managed</option>
              <option value="openai_tts">OpenAI TTS</option>
              <option value="mock_tts">Mock TTS</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="realtimeModel" className="block text-sm font-medium text-gray-700 mb-2">
              Realtime Model
            </label>
            <input
              id="realtimeModel"
              name="realtimeModel"
              value={form.realtimeModel}
              onChange={handleChange}
              className="input-field"
              placeholder="gpt-4o-realtime-preview-2024-12-17"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-gray-900">Allow fallback</span>
              <span className="block text-xs text-gray-500">Drop from realtime to the standard pipeline if startup fails.</span>
            </span>
            <input
              type="checkbox"
              name="allowFallback"
              checked={form.allowFallback}
              onChange={handleChange}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-gray-900">Enable health gating</span>
              <span className="block text-xs text-gray-500">Skip a known-bad realtime provider before a call starts.</span>
            </span>
            <input
              type="checkbox"
              name="healthGatingEnabled"
              checked={form.healthGatingEnabled}
              onChange={handleChange}
              className="h-4 w-4"
            />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Speech Runtime'}
        </button>
      </form>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Provider Health</h4>
          {health?.speech ? (
            <span className="text-xs text-gray-500">
              Strategy: <span className="font-medium text-gray-700">{health.speech.strategy}</span>
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
            Loading provider health…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {(health?.speech?.providers || []).map((provider) => (
              <div
                key={`${provider.type}:${provider.name}`}
                className={`rounded-2xl border px-4 py-4 ${statusClasses(provider.ok)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
                      {provider.type}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{provider.name}</div>
                  </div>
                  <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-medium uppercase tracking-wide">
                    {provider.ok ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs opacity-90">
                  <div>Checked: {formatTimestamp(provider.checkedAt)}</div>
                  <div>Source: {provider.source}</div>
                  <div>TTL: {provider.ttlMs ? `${Math.round(provider.ttlMs / 1000)}s` : '—'}</div>
                  <div>{provider.detail || 'No detail provided'}</div>
                </div>
                <div className="mt-3 flex gap-2 text-[11px] font-medium uppercase tracking-wide opacity-80">
                  {provider.selected ? <span>Selected</span> : null}
                  {provider.gatingRelevant ? <span>Health-gated</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
