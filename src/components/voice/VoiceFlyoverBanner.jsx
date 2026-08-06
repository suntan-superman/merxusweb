import { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';

// Check if flyover is complete (matches the key used in VoiceFlyover)
const FLYOVER_COMPLETE_KEY = 'merxus_voice_flyover_complete';
const FLYOVER_DISMISSED_KEY = 'merxus_voice_flyover_dismissed';

const tenantStorageKey = (key, officeId) => (officeId ? `${key}:${officeId}` : key);

export default function VoiceFlyoverBanner({ onStartFlyover, settings, officeId }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if flyover was completed or permanently dismissed
    const isComplete = localStorage.getItem(tenantStorageKey(FLYOVER_COMPLETE_KEY, officeId)) === 'true';
    const isDismissed = localStorage.getItem(tenantStorageKey(FLYOVER_DISMISSED_KEY, officeId)) === 'true';

    // Also check if essential settings are filled
    const hasEssentials = settings?.name && settings?.twilioPhoneNumber;

    // Show banner if not complete, not dismissed, and missing essentials
    if (!isComplete && !isDismissed && !hasEssentials) {
      setVisible(true);
    }
  }, [settings, officeId]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    // Store in session only - will show again next session
    sessionStorage.setItem('voice_flyover_dismissed_session', 'true');
  };

  const handlePermanentDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem(tenantStorageKey(FLYOVER_DISMISSED_KEY, officeId), 'true');
  };

  const handleStart = () => {
    onStartFlyover?.();
  };

  if (!visible || dismissed) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Complete Your Setup</h3>
            <p className="text-primary-100 text-sm">
              Get your AI phone assistant ready in just 5 minutes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-primary-600 rounded-lg font-semibold transition-colors"
          >
            Start Setup Guide
            <ArrowRight size={18} />
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Dismiss for now"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Export the completion function for use after flyover
export function markVoiceFlyoverComplete(officeId) {
  localStorage.setItem(tenantStorageKey(FLYOVER_COMPLETE_KEY, officeId), 'true');
}

// Export reset function for testing
export function resetVoiceFlyoverState(officeId) {
  localStorage.removeItem(tenantStorageKey(FLYOVER_COMPLETE_KEY, officeId));
  localStorage.removeItem(tenantStorageKey(FLYOVER_DISMISSED_KEY, officeId));
  localStorage.removeItem(tenantStorageKey('merxus_voice_flyover_state', officeId));
  sessionStorage.removeItem('voice_flyover_dismissed_session');
}
