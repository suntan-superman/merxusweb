import { useEffect, useState } from 'react';
import {
  fetchSystemSettings,
  updateSystemSettings,
  fetchBillingConfig,
  updateBillingConfig,
} from '../../api/merxus';

const TENANT_SECTIONS = [
  { key: 'office', label: 'Voice / Office' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'restaurant', label: 'Restaurant' },
];

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [billingConfig, setBillingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, billingData] = await Promise.all([
        fetchSystemSettings(),
        fetchBillingConfig(),
      ]);
      setSettings(settingsData);
      setBillingConfig(billingData);
    } catch (err) {
      console.error(err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function flashSuccess(message) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleSaveSettings(updates) {
    try {
      setSavingSettings(true);
      setError(null);
      setSuccess(null);

      const newSettings = await updateSystemSettings(updates);
      setSettings(newSettings);
      flashSuccess('System settings saved successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveBilling() {
    try {
      setSavingBilling(true);
      setError(null);
      setSuccess(null);

      const updated = await updateBillingConfig({
        trialDays: Number(billingConfig?.trialDays || 30),
        tenants: billingConfig?.tenants || {},
      });
      setBillingConfig(updated);
      flashSuccess('Billing config saved successfully.');
    } catch (err) {
      console.error(err);
      const details = err?.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setError(details.join(' '));
      } else {
        setError(err?.response?.data?.error || 'Failed to save billing config.');
      }
    } finally {
      setSavingBilling(false);
    }
  }

  function updateBillingField(tenantType, field, value) {
    setBillingConfig((current) => ({
      ...current,
      tenants: {
        ...(current?.tenants || {}),
        [tenantType]: {
          ...(current?.tenants?.[tenantType] || {}),
          [field]: value,
        },
      },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure system-wide settings, defaults, and active billing price IDs.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-700 border border-red-200 rounded-md bg-red-50">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 text-sm border rounded-md bg-primary-50 border-primary-200 text-primary-700">
          {success}
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">General Settings</h3>
        <p className="mb-4 text-sm text-gray-600">
          System-wide configuration options
        </p>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">System Configuration</label>
            <p className="text-sm text-gray-600">Settings management features will be available here.</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => handleSaveSettings(settings || {})}
              disabled={savingSettings}
              className="px-4 py-2 text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {savingSettings ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Billing Price Configuration</h3>
            <p className="text-sm text-gray-600">
              This is the active backend source of truth for Stripe price IDs used by both web and mobile checkout.
            </p>
          </div>
          <span className="px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 rounded-full bg-indigo-50">
            Source: {billingConfig?.source || 'unknown'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Trial Days
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={billingConfig?.trialDays ?? 30}
              onChange={(e) => setBillingConfig((current) => ({
                ...current,
                trialDays: e.target.value,
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Shared trial period used for subscription checkout.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {TENANT_SECTIONS.map((section) => (
            <div key={section.key} className="p-4 border border-gray-200 rounded-lg">
              <h4 className="mb-3 text-base font-semibold text-gray-900">{section.label}</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Onboarding Price ID
                  </label>
                  <input
                    type="text"
                    value={billingConfig?.tenants?.[section.key]?.onboardingPriceId || ''}
                    onChange={(e) => updateBillingField(section.key, 'onboardingPriceId', e.target.value.trim())}
                    className="w-full px-4 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="price_..."
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Subscription Price ID
                  </label>
                  <input
                    type="text"
                    value={billingConfig?.tenants?.[section.key]?.subscriptionPriceId || ''}
                    onChange={(e) => updateBillingField(section.key, 'subscriptionPriceId', e.target.value.trim())}
                    className="w-full px-4 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="price_..."
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!billingConfig?.tenants?.[section.key]?.webOnly}
                    onChange={(e) => updateBillingField(section.key, 'webOnly', e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  Web only
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 mt-6 border border-amber-200 rounded-lg bg-amber-50">
          <p className="text-sm text-amber-800">
            Updating these IDs changes future pricing reads and future checkout sessions. Existing active subscriptions
            already created in Stripe keep their current subscription price unless migrated or canceled separately.
          </p>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveBilling}
            disabled={savingBilling || !billingConfig}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {savingBilling ? 'Saving...' : 'Save Billing Config'}
          </button>
        </div>
      </div>
    </div>
  );
}
