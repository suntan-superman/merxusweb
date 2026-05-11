import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  ContactRound,
  CreditCard,
  FlaskConical,
  GitMerge,
  Home,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  MessagesSquare,
  Package,
  Phone,
  Route,
  Rocket,
  Satellite,
  Settings,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  UserCog,
  Users,
  Utensils,
  Voicemail,
  Wrench,
  Zap,
} from 'lucide-react';
import { getNavigationGroups, getNavigationItems } from '../../navigation/navigationRegistry';
import {
  buildDefaultNavigationPreferences,
  getNavigationPreferences,
  mergeNavigationPreferences,
  saveNavigationPreferences,
} from '../../services/navigationPreferencesService';
import PlanTierBadge from '../billing/PlanTierBadge';
import SignOutButton from '../common/SignOutButton';

const ICONS = {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  ContactRound,
  CreditCard,
  FlaskConical,
  GitMerge,
  Home,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  MessagesSquare,
  Package,
  Phone,
  Route,
  Rocket,
  Satellite,
  Settings,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  UserCog,
  Users,
  Utensils,
  Voicemail,
  Wrench,
  Zap,
};

export default function QuickStartSidebar({
  user,
  userClaims,
  tenantType,
  homePath,
  tenantIcon,
  tenantName,
  subtitle,
  tier,
  tierLabel,
  subscriptionLoading,
  professionalUnlocked,
  eliteUnlocked,
  attentionCounts = {},
  mobile = false,
}) {
  const location = useLocation();
  const role = userClaims?.role || 'staff';
  const userId = user?.uid;
  const availableItems = useMemo(() => getNavigationItems({ tenantType, role }), [role, tenantType]);
  const groups = useMemo(() => getNavigationGroups(), []);
  const defaults = useMemo(() => buildDefaultNavigationPreferences({
    tenantType,
    role,
    availableItems,
  }), [availableItems, role, tenantType]);
  const [prefs, setPrefs] = useState(defaults);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [editQuickStart, setEditQuickStart] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPrefs() {
      try {
        const saved = await getNavigationPreferences(userId);
        if (!mounted) return;
        setPrefs(mergeNavigationPreferences({ savedPrefs: saved, defaults, availableItems }));
      } catch (error) {
        console.warn('[QuickStartSidebar] Could not load navigation preferences:', error);
        if (mounted) setPrefs(defaults);
      } finally {
        if (mounted) setPrefsLoaded(true);
      }
    }

    if (userId) loadPrefs();
    else {
      setPrefs(defaults);
      setPrefsLoaded(true);
    }

    return () => {
      mounted = false;
    };
  }, [availableItems, defaults, userId]);

  const itemById = useMemo(() => new Map(availableItems.map((item) => [item.id, item])), [availableItems]);
  const quickStartItems = (prefs.quickStartIds || []).map((id) => itemById.get(id)).filter(Boolean);

  async function updatePrefs(patch, successMessage = '') {
    const next = mergeNavigationPreferences({
      savedPrefs: { ...prefs, ...patch },
      defaults,
      availableItems,
    });
    setPrefs(next);
    try {
      await saveNavigationPreferences(userId, patch);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      console.warn('[QuickStartSidebar] Could not save navigation preferences:', error);
      toast.error('Could not save navigation preferences. Please try again.');
    }
  }

  function toggleGroup(groupId) {
    updatePrefs({
      collapsedGroups: {
        ...(prefs.collapsedGroups || {}),
        [groupId]: !prefs.collapsedGroups?.[groupId],
      },
    });
  }

  function addQuickStart(item) {
    if ((prefs.quickStartIds || []).includes(item.id)) {
      updatePrefs({ quickStartIds: [item.id, ...prefs.quickStartIds.filter((id) => id !== item.id)] }, 'Quick Start updated');
      return;
    }
    updatePrefs({ quickStartIds: [...(prefs.quickStartIds || []), item.id] }, 'Added to Quick Start');
  }

  function removeQuickStart(item) {
    updatePrefs({ quickStartIds: (prefs.quickStartIds || []).filter((id) => id !== item.id) }, 'Removed from Quick Start');
  }

  function moveQuickStart(item, direction) {
    const ids = [...(prefs.quickStartIds || [])];
    const index = ids.indexOf(item.id);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    updatePrefs({ quickStartIds: ids }, 'Quick Start updated');
  }

  function moveQuickStartToTop(item) {
    const ids = [...(prefs.quickStartIds || [])].filter((id) => id !== item.id);
    updatePrefs({ quickStartIds: [item.id, ...ids] }, 'Quick Start updated');
  }

  function lockedPath(item) {
    if (!item.requiredPlan) return item.path;
    const unlocked = item.requiredPlan === 'elite' ? eliteUnlocked : professionalUnlocked;
    if (unlocked) return item.path;
    return `${homePath}/billing?requiredTier=${item.requiredPlan}&from=${encodeURIComponent(item.path)}`;
  }

  function isLocked(item) {
    if (!item.requiredPlan) return false;
    return item.requiredPlan === 'elite' ? !eliteUnlocked : !professionalUnlocked;
  }

  function groupHasActiveItem(groupId) {
    return availableItems.some((item) => item.groupId === groupId && location.pathname === item.path);
  }

  return (
    <aside className={mobile
      ? 'flex h-full min-h-0 w-full flex-col bg-white dark:bg-slate-900'
      : 'hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:flex'}
    >
      <div className="flex-shrink-0 border-b border-gray-200 px-5 py-5 dark:border-slate-700">
        <NavLink to={homePath} className="block">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tenantIcon}</span>
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-slate-100">
              {tenantName}
            </h1>
          </div>
          <div className="ml-9 mt-1 flex flex-wrap items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>
            {!subscriptionLoading ? <PlanTierBadge tier={tier} label={tierLabel} /> : null}
          </div>
        </NavLink>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        <QuickStartNav
          collapsed={Boolean(prefs.collapsedGroups?.quick_start)}
          editMode={editQuickStart}
          loaded={prefsLoaded}
          items={quickStartItems}
          lockedPath={lockedPath}
          isLocked={isLocked}
          attentionCounts={attentionCounts}
          onToggle={() => toggleGroup('quick_start')}
          onEdit={() => setEditQuickStart((value) => !value)}
          onRemove={removeQuickStart}
          onMove={moveQuickStart}
        />

        {groups.filter((group) => group.id !== 'quick_start').map((group) => {
          const groupItems = availableItems.filter((item) => item.groupId === group.id);
          if (!groupItems.length) return null;
          const collapsed = Boolean(prefs.collapsedGroups?.[group.id]);
          const activeInside = collapsed && groupHasActiveItem(group.id);
          return (
            <NavGroup
              key={group.id}
              group={group}
              collapsed={collapsed}
              activeInside={activeInside}
              onToggle={() => toggleGroup(group.id)}
            >
              {groupItems.map((item) => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  to={lockedPath(item)}
                  locked={isLocked(item)}
                  pinned={(prefs.quickStartIds || []).includes(item.id)}
                  attentionCount={attentionCounts[item.id] || 0}
                  onAdd={() => addQuickStart(item)}
                  onRemove={() => removeQuickStart(item)}
                  onMoveTop={() => moveQuickStartToTop(item)}
                />
              ))}
            </NavGroup>
          );
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
            <span className="text-sm font-semibold text-primary-600">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
              {user?.displayName || user?.email || 'User'}
            </p>
            <p className="text-xs capitalize text-gray-500 dark:text-slate-400">
              {role}
            </p>
          </div>
        </div>
        <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Sign Out
        </SignOutButton>
      </div>
    </aside>
  );
}

function QuickStartNav({
  collapsed,
  editMode,
  loaded,
  items,
  lockedPath,
  isLocked,
  attentionCounts,
  onToggle,
  onEdit,
  onRemove,
  onMoveTop,
  onMove,
}) {
  return (
    <section className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
        >
          <span>★</span>
          <span className="truncate">Quick Start</span>
          <span className={`ml-auto text-sm transition-transform ${collapsed ? '' : 'rotate-90'}`}>›</span>
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>
      {!collapsed ? (
        <div className="mt-1 max-h-72 space-y-1 overflow-y-auto pr-1">
          {!loaded ? (
            <p className="px-2 py-2 text-xs text-emerald-700 dark:text-emerald-200">Loading shortcuts...</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-2 text-xs text-emerald-700 dark:text-emerald-200">
              Pin your most-used actions here for faster access.
            </p>
          ) : items.map((item, index) => (
            <NavItemRow
              key={item.id}
              item={item}
              to={lockedPath(item)}
              locked={isLocked(item)}
              compact
              editMode={editMode}
              attentionCount={attentionCounts[item.id] || 0}
              onRemove={() => onRemove(item)}
              onMoveUp={() => onMove(item, 'up')}
              onMoveDown={() => onMove(item, 'down')}
              moveUpDisabled={index === 0}
              moveDownDisabled={index === items.length - 1}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NavGroup({ group, collapsed, activeInside, onToggle, children }) {
  return (
    <section className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className={`w-full rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors ${
          activeInside
            ? 'bg-green-50 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{group.label}</span>
            {group.badgeLabel ? <PlanTierBadge tier={group.planTier} label={group.badgeLabel} /> : null}
          </span>
          <span className={`text-base text-gray-400 transition-transform dark:text-slate-500 ${collapsed ? '' : 'rotate-90'}`}>›</span>
        </span>
        {group.summary ? <span className="mt-0.5 block normal-case tracking-normal text-slate-400">{group.summary}</span> : null}
      </button>
      {!collapsed ? <div className="space-y-1">{children}</div> : null}
    </section>
  );
}

function NavItemRow({
  item,
  to,
  locked = false,
  pinned = false,
  compact = false,
  editMode = false,
  attentionCount = 0,
  onAdd,
  onRemove,
  onMoveTop,
  onMoveUp,
  onMoveDown,
  moveUpDisabled,
  moveDownDisabled,
}) {
  const planBadgeTier = item.requiredPlan || 'professional';
  const planBadgeLabel = item.requiredPlan === 'elite' ? 'Elite' : item.requiredPlan === 'professional' ? 'Pro' : '';
  const Icon = ICONS[item.icon] || LayoutDashboard;
  return (
    <div className="group flex items-center gap-1">
      {editMode ? (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={moveUpDisabled}
            onClick={onMoveUp}
            aria-label={`Move ${item.label} up`}
            className="rounded px-1 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={moveDownDisabled}
            onClick={onMoveDown}
            aria-label={`Move ${item.label} down`}
            className="rounded px-1 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ↓
          </button>
        </div>
      ) : null}
      <NavLink
        to={to}
        className={({ isActive }) => {
          const base = `min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${compact ? 'py-1.5' : ''}`;
          if (attentionCount > 0) {
            return `${base} flex items-center justify-between gap-3 ${
              isActive
                ? 'border-l-4 border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40'
            }`;
          }
          if (locked) {
            return `${base} flex items-center justify-between gap-3 ${
              isActive
                ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200'
            }`;
          }
          return `${base} flex items-center justify-between gap-3 ${
            isActive
              ? 'border-l-4 border-green-600 bg-green-50 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-200'
              : 'text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200'
          }`;
        }}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </span>
        {attentionCount > 0 ? (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            {attentionCount}
          </span>
        ) : locked && planBadgeLabel ? (
          <PlanTierBadge tier={planBadgeTier} label={planBadgeLabel} />
        ) : null}
      </NavLink>
      {editMode ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.label} from Quick Start`}
          className="rounded px-2 py-1 text-sm font-semibold text-gray-500 hover:bg-white hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ×
        </button>
      ) : onAdd || onRemove ? (
        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
          {pinned && onMoveTop ? (
            <button
              type="button"
              onClick={onMoveTop}
              aria-label={`Move ${item.label} to top of Quick Start`}
              title="Move to top"
              className="rounded px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-emerald-700 dark:text-slate-500 dark:hover:bg-slate-800"
            >
              Top
            </button>
          ) : null}
          <button
            type="button"
            onClick={pinned ? onRemove : onAdd}
            aria-label={pinned ? `Remove ${item.label} from Quick Start` : `Add ${item.label} to Quick Start`}
            title={pinned ? 'Remove from Quick Start' : 'Add to Quick Start'}
            className="rounded px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-emerald-700 dark:text-slate-500 dark:hover:bg-slate-800"
          >
            {pinned ? '−' : '+'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
