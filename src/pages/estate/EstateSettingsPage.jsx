import { useState } from 'react';
import { useEstateSettings, useUpdateEstateSettings } from '../../hooks/useEstateQueries';
import EstateAgentProfile from '../../components/settings/estate/EstateAgentProfile';
import EstateAgentHighlights from '../../components/settings/estate/EstateAgentHighlights';
import EstateBusinessHours from '../../components/settings/estate/EstateBusinessHours';
import HolidaySchedule from '../../components/settings/HolidaySchedule';
import EstateAISettings from '../../components/settings/estate/EstateAISettings';
import EstateRouting from '../../components/settings/estate/EstateRouting';
import LoadingSpinner from '../../components/LoadingSpinner';

const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'highlights', label: 'Highlights', icon: '⭐' },
  { id: 'hours', label: 'Business Hours', icon: '🕐' },
  { id: 'holidays', label: 'Holidays', icon: '📅' },
  { id: 'routing', label: 'Call Routing', icon: '📞' },
  { id: 'ai', label: 'AI & Voice', icon: '🤖' },
];

export default function EstateSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  // React Query hooks
  const { data: settings, isLoading, error: loadError, refetch } = useEstateSettings();
  const updateSettings = useUpdateEstateSettings();

  const handleSave = async (updated) => {
    updateSettings.mutate(updated);
  };

  if (isLoading) {
    return <LoadingSpinner />;
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
          Configure your agent profile, business hours, and AI assistant settings
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
          <EstateAgentProfile settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'highlights' && (
          <EstateAgentHighlights settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'hours' && (
          <EstateBusinessHours settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'holidays' && (
          <HolidaySchedule settings={settings} onSave={handleSave} saving={updateSettings.isPending} tenantType="real_estate" />
        )}
        {activeTab === 'routing' && (
          <EstateRouting settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
        {activeTab === 'ai' && (
          <EstateAISettings settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
        )}
      </div>
    </div>
  );
}
