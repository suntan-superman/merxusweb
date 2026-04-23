import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEstateSettings, useUpdateEstateSettings } from '../../hooks/useEstateQueries';
import EstateAgentProfile from '../../components/settings/estate/EstateAgentProfile';
import EstateAgentHighlights from '../../components/settings/estate/EstateAgentHighlights';
import EstateBusinessHours from '../../components/settings/estate/EstateBusinessHours';
import HolidaySchedule from '../../components/settings/HolidaySchedule';
import EstateAISettings from '../../components/settings/estate/EstateAISettings';
import EstateRouting from '../../components/settings/estate/EstateRouting';
import LoadingSpinner from '../../components/LoadingSpinner';
import SmsSettings from '../../components/settings/SmsSettings';
import VoiceProviderHealthPanel from '../../components/settings/voice/VoiceProviderHealthPanel';

const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'highlights', label: 'Highlights', icon: '⭐' },
  { id: 'hours', label: 'Business Hours', icon: '🕐' },
  { id: 'holidays', label: 'Holidays', icon: '📅' },
  { id: 'routing', label: 'Call Routing', icon: '📞' },
  { id: 'ai', label: 'AI & Voice', icon: '🤖' },
  { id: 'sms', label: 'SMS Messaging', icon: '💬' },
];

export default function EstateSettingsPage() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'profile'
  );
  const highlightSpeechRuntime = activeTab === 'ai' && searchParams.get('panel') === 'speech-runtime';
  
  // React Query hooks
  const { data: settings, isLoading, error: loadError, refetch } = useEstateSettings();
  const updateSettings = useUpdateEstateSettings();

  useEffect(() => {
    if (TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const handleSave = async (updated) => {
    updateSettings.mutate(updated);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (loadError || !settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-slate-300">Failed to load settings.</p>
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
          Configure your agent profile, business hours, and AI assistant settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
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
                    ? 'border-primary-500 text-primary-600 dark:text-primary-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:border-slate-600'
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
          <div className="space-y-6">
            <EstateAISettings settings={settings} onSave={handleSave} saving={updateSettings.isPending} />
            <VoiceProviderHealthPanel
              settings={settings}
              onSave={handleSave}
              saving={updateSettings.isPending}
              highlighted={highlightSpeechRuntime}
              tenantType="real_estate"
            />
          </div>
        )}
        {activeTab === 'sms' && (
          <SmsSettings settings={settings} tenantType="real_estate" />
        )}
      </div>
    </div>
  );
}
