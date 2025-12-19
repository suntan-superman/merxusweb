import { useState } from 'react';
import { useVoiceSettings, useUpdateVoiceSettings } from '../../hooks/useVoiceQueries';
import VoiceCompanyProfile from '../../components/settings/voice/VoiceCompanyProfile';
import VoiceBusinessHours from '../../components/settings/voice/VoiceBusinessHours';
import HolidaySchedule from '../../components/settings/HolidaySchedule';
import VoiceAISettings from '../../components/settings/voice/VoiceAISettings';
import VoiceServicesProducts from '../../components/settings/voice/VoiceServicesProducts';
import ManagersSettings from '../../components/settings/ManagersSettings';

const TABS = [
  { id: 'profile', label: 'Company Profile', icon: '🏢' },
  { id: 'hours', label: 'Business Hours', icon: '🕐' },
  { id: 'holidays', label: 'Holidays', icon: '📅' },
  { id: 'managers', label: 'Managers', icon: '👥' },
  { id: 'services', label: 'Services & Products', icon: '📦' },
  { id: 'ai', label: 'AI & Voice', icon: '🤖' },
];

export default function VoiceSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  // React Query hooks
  const { data: settings, isLoading, error: loadError, refetch } = useVoiceSettings();
  const updateSettings = useUpdateVoiceSettings();

  const handleSave = async (updated) => {
    updateSettings.mutate(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load settings.</p>
        <button onClick={() => refetch()} className="btn-primary mt-4">
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
          <VoiceCompanyProfile settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'hours' && (
          <VoiceBusinessHours settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'holidays' && (
          <HolidaySchedule settings={settings} onSave={handleSave} saving={updateSettings.isPending} tenantType="voice" />
        )}
        {activeTab === 'managers' && (
          <ManagersSettings settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'services' && (
          <VoiceServicesProducts 
            settings={settings} 
            onSave={handleSave} 
            saving={updateSettings.isPending}
            businessType={settings.businessType}
          />
        )}
        {activeTab === 'ai' && (
          <VoiceAISettings 
            settings={settings} 
            onSave={handleSave} 
            saving={updateSettings.isPending}
            businessType={settings.businessType}
          />
        )}
      </div>
    </div>
  );
}
