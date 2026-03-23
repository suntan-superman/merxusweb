import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getPendingFirstLoginChecklist,
  isFirstLoginChecklistCompleted,
  markFirstLoginChecklistCompleted,
} from '../../utils/firstLoginChecklist';

function getSettingsPath(tenantType, tab) {
  const suffix = tab ? `?tab=${tab}` : '';
  if (tenantType === 'restaurant') return `/restaurant/settings${suffix}`;
  if (tenantType === 'real_estate') return `/estate/settings${suffix}`;
  return `/voice/settings${suffix}`;
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
  const { userClaims } = useAuth();
  const [visible, setVisible] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const canManagePortal = userClaims?.role === 'owner' || userClaims?.role === 'manager';
  const normalizedTenantType =
    tenantType === 'office' || tenantType === 'general'
      ? 'voice'
      : tenantType === 'agent'
      ? 'real_estate'
      : tenantType;

  const settingsPath = useMemo(
    () => (tab) => getSettingsPath(normalizedTenantType, tab),
    [normalizedTenantType]
  );
  const iosAppStoreUrl =
    import.meta.env.VITE_IOS_APP_STORE_URL || 'https://apps.apple.com/us/iphone/search?term=merxus';

  const items = useMemo(() => {
    const baseItems = [
      {
        icon: '🕒',
        title: 'Set business hours',
        description: 'Update open/closed hours and timezone so the assistant handles calls correctly.',
        to: settingsPath('hours'),
        actionLabel: 'Open Settings',
      },
      {
        icon: '📬',
        title: 'Choose who gets alerts',
        description: 'Add additional email addresses for notifications and missed-call follow-up.',
        to:
          normalizedTenantType === 'restaurant'
            ? settingsPath('notifications')
            : settingsPath('sms'),
        actionLabel: 'Manage Alerts',
      },
      {
        icon: '🧩',
        title: 'Expand products and services',
        description: 'List what you offer so callers get accurate answers from the assistant.',
        to:
          normalizedTenantType === 'restaurant'
            ? '/restaurant/menu'
            : normalizedTenantType === 'real_estate'
            ? '/estate/listings'
            : settingsPath('services'),
        actionLabel: 'Edit Details',
      },
      {
        icon: '🎙️',
        title: 'Customize AI voice and profile',
        description: 'Add specialties, years of experience, testimonials, and other business details.',
        to: settingsPath('ai'),
        actionLabel: 'Customize AI',
      },
      getTenantSpecificItem(normalizedTenantType),
    ];

    return baseItems;
  }, [settingsPath, normalizedTenantType]);

  useEffect(() => {
    if (!canManagePortal) {
      setVisible(false);
      return;
    }

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
    setConfirmDismiss(false);
  }, [canManagePortal, normalizedTenantType, tenantId, userId]);

  const handleConfirmDismiss = () => {
    markFirstLoginChecklistCompleted({
      tenantType: normalizedTenantType,
      tenantId,
      userId,
    });
    setConfirmDismiss(false);
    setVisible(false);
  };

  if (!visible || !canManagePortal) return null;

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
          onClick={() => setConfirmDismiss((value) => !value)}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          {confirmDismiss ? 'Cancel' : 'Dismiss'}
        </button>
      </div>

      {confirmDismiss ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Setup complete?</p>
              <p className="text-sm text-emerald-800 mt-1">
                If everything looks good, we’ll hide this launch checklist from your dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDismiss(false)}
                className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Keep Checklist
              </button>
              <button
                type="button"
                onClick={handleConfirmDismiss}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Yes, Hide It
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
      </div>
    </section>
  );
}
