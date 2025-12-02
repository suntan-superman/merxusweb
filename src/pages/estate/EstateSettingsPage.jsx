import { useEffect, useState } from 'react';
import { fetchEstateSettings, updateEstateSettings } from '../../api/estate';
import EstateAgentProfile from '../../components/settings/estate/EstateAgentProfile';
import EstateAgentHighlights from '../../components/settings/estate/EstateAgentHighlights';
import EstateBusinessHours from '../../components/settings/estate/EstateBusinessHours';
import EstateAISettings from '../../components/settings/estate/EstateAISettings';
import EstateRouting from '../../components/settings/estate/EstateRouting';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EstateSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEstateSettings();
      setSettings(data);
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

  async function handleSave(updated) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateEstateSettings(updated);
      setSettings((prev) => ({ ...prev, ...updated }));
      setSuccess('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load settings.</p>
        <button onClick={load} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure your agent profile, business hours, and AI assistant settings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-700">
          {success}
        </div>
      )}

      <EstateAgentProfile settings={settings} onSave={handleSave} saving={saving} />
      <EstateAgentHighlights settings={settings} onSave={handleSave} saving={saving} />
      <EstateBusinessHours settings={settings} onSave={handleSave} saving={saving} />
      <EstateRouting settings={settings} onSave={handleSave} saving={saving} />
      <EstateAISettings settings={settings} onSave={handleSave} saving={saving} />
    </div>
  );
}

