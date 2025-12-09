import { useEffect, useState } from 'react';
import { fetchEstateSettings, updateEstateSettings } from '../../api/estate';
import EstateAgentProfile from '../../components/settings/estate/EstateAgentProfile';
import EstateAgentHighlights from '../../components/settings/estate/EstateAgentHighlights';
import EstateBusinessHours from '../../components/settings/estate/EstateBusinessHours';
import EstateAISettings from '../../components/settings/estate/EstateAISettings';
import EstateRouting from '../../components/settings/estate/EstateRouting';
import LoadingSpinner from '../../components/LoadingSpinner';

const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'highlights', label: 'Highlights', icon: '⭐' },
  { id: 'hours', label: 'Business Hours', icon: '🕐' },
  { id: 'routing', label: 'Call Routing', icon: '📞' },
  { id: 'ai', label: 'AI & Voice', icon: '🤖' },
];

export default function EstateSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure your agent profile, business hours, and AI assistant settings
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-700">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors
                flex items-center gap-2
                ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'profile' && (
          <EstateAgentProfile settings={settings} onSave={handleSave} saving={saving} />
        )}
        {activeTab === 'highlights' && (
          <EstateAgentHighlights settings={settings} onSave={handleSave} saving={saving} />
        )}
        {activeTab === 'hours' && (
          <EstateBusinessHours settings={settings} onSave={handleSave} saving={saving} />
        )}
        {activeTab === 'routing' && (
          <EstateRouting settings={settings} onSave={handleSave} saving={saving} />
        )}
        {activeTab === 'ai' && (
          <EstateAISettings settings={settings} onSave={handleSave} saving={saving} />
        )}
      </div>
    </div>
  );
}
