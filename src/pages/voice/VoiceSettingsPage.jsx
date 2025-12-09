import { useEffect, useState } from 'react';
import { fetchVoiceSettings, updateVoiceSettings } from '../../api/voice';
import VoiceCompanyProfile from '../../components/settings/voice/VoiceCompanyProfile';
import VoiceBusinessHours from '../../components/settings/voice/VoiceBusinessHours';
import VoiceAISettings from '../../components/settings/voice/VoiceAISettings';
import VoiceServicesProducts from '../../components/settings/voice/VoiceServicesProducts';

const TABS = [
  { id: 'profile', label: 'Company Profile', icon: '🏢' },
  { id: 'hours', label: 'Business Hours', icon: '🕐' },
  { id: 'services', label: 'Services & Products', icon: '📦' },
  { id: 'ai', label: 'AI & Voice', icon: '🤖' },
];

export default function VoiceSettingsPage() {
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
      const data = await fetchVoiceSettings();
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

      const newSettings = await updateVoiceSettings(updated);
      setSettings((prev) => ({ ...prev, ...newSettings }));
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings…</p>
        </div>
      </div>
    );
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
          Configure your business information, hours, and AI assistant settings
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
          <VoiceCompanyProfile settings={settings} onSave={handleSave} saving={saving} />
        )}
        {activeTab === 'hours' && (
          <VoiceBusinessHours settings={settings} onSave={handleSave} saving={saving} />
        )}
        {activeTab === 'services' && (
          <VoiceServicesProducts 
            settings={settings} 
            onSave={handleSave} 
            saving={saving}
            businessType={settings.businessType}
          />
        )}
        {activeTab === 'ai' && (
          <VoiceAISettings 
            settings={settings} 
            onSave={handleSave} 
            saving={saving}
            businessType={settings.businessType}
          />
        )}
      </div>
    </div>
  );
}
