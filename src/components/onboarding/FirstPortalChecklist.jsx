import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPendingFirstLoginChecklist,
  isFirstLoginChecklistCompleted,
  markFirstLoginChecklistCompleted,
} from '../../utils/firstLoginChecklist';

function getSettingsPath(tenantType) {
  if (tenantType === 'restaurant') return '/restaurant/settings';
  if (tenantType === 'real_estate') return '/estate/settings';
  return '/voice/settings';
}

function getTenantSpecificItem(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      icon: '🍽️',
      title: 'Import or build your menu',
      description: 'Bring in menu items so your AI can answer questions and take accurate orders.',
      to: '/restaurant/menu',
      actionLabel: 'Open Menu',
    };
  }

  if (tenantType === 'real_estate') {
    return {
      icon: '🏠',
      title: 'Import your listings',
      description: 'Add active properties so your AI can answer listing questions and pre-qualify leads.',
      to: '/estate/listings',
      actionLabel: 'Open Listings',
    };
  }

  return {
    icon: '🔀',
    title: 'Set call routing rules',
    description: 'Define where sales, support, and after-hours calls should be routed.',
    to: '/voice/routing',
    actionLabel: 'Open Routing',
  };
}

export default function FirstPortalChecklist({ tenantType, tenantId, userId, className = '' }) {
  const [visible, setVisible] = useState(false);
  const normalizedTenantType =
    tenantType === 'office' || tenantType === 'general'
      ? 'voice'
      : tenantType === 'agent'
      ? 'real_estate'
      : tenantType;

  const settingsPath = useMemo(() => getSettingsPath(normalizedTenantType), [normalizedTenantType]);
  const iosAppStoreUrl =
    import.meta.env.VITE_IOS_APP_STORE_URL || 'https://apps.apple.com/us/search?term=Merxus';
  const androidAppStoreUrl =
    import.meta.env.VITE_ANDROID_APP_STORE_URL || 'https://play.google.com/store/search?q=Merxus&c=apps';

  const items = useMemo(() => {
    const baseItems = [
      {
        icon: '🕒',
        title: 'Set business hours',
        description: 'Update open/closed hours and timezone so the assistant handles calls correctly.',
        to: settingsPath,
        actionLabel: 'Open Settings',
      },
      {
        icon: '📬',
        title: 'Choose who gets alerts',
        description: 'Add additional email addresses for notifications and missed-call follow-up.',
        to: settingsPath,
        actionLabel: 'Manage Alerts',
      },
      {
        icon: '🧩',
        title: 'Expand products and services',
        description: 'List what you offer so callers get accurate answers from the assistant.',
        to: settingsPath,
        actionLabel: 'Edit Details',
      },
      {
        icon: '🎙️',
        title: 'Customize AI voice and profile',
        description: 'Add specialties, years of experience, testimonials, and other business details.',
        to: settingsPath,
        actionLabel: 'Customize AI',
      },
      getTenantSpecificItem(normalizedTenantType),
    ];

    return baseItems;
  }, [settingsPath, normalizedTenantType]);

  useEffect(() => {
    if (!normalizedTenantType || !userId) {
      setVisible(false);
      return;
    }

    const pending = getPendingFirstLoginChecklist();
    if (!pending) {
      setVisible(false);
      return;
    }

    const matchesUser = pending.userId === userId;
    const matchesType = pending.tenantType === normalizedTenantType;
    const matchesTenantId =
      !pending.tenantId || !tenantId || String(pending.tenantId) === String(tenantId);

    if (!matchesUser || !matchesType || !matchesTenantId) {
      setVisible(false);
      return;
    }

    const completed = isFirstLoginChecklistCompleted({
      tenantType: normalizedTenantType,
      tenantId,
      userId,
    });
    setVisible(!completed);
  }, [normalizedTenantType, tenantId, userId]);

  const handleDismiss = () => {
    markFirstLoginChecklistCompleted({
      tenantType: normalizedTenantType,
      tenantId,
      userId,
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className={`bg-emerald-50 border border-emerald-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-emerald-900">Next Steps Before You Go Live</h2>
          <p className="text-sm text-emerald-800 mt-1">
            Your registration is complete. These quick actions will improve your AI assistant right away.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="bg-white border border-emerald-100 rounded-lg px-4 py-3 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                <span className="mr-2" aria-hidden>{item.icon}</span>
                {item.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </div>
            <Link
              to={item.to}
              className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {item.actionLabel} →
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-white border border-emerald-100 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="font-medium text-gray-900">📱 Download the mobile app:</span>
        <a
          href={iosAppStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          iOS App Store
        </a>
        <span className="text-gray-400">|</span>
        <a
          href={androidAppStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Google Play
        </a>
      </div>
    </section>
  );
}
