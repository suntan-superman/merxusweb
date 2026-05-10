import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchEstateSettings } from '../../api/estate';
import useTeamAccessPending from '../../hooks/useTeamAccessPending';
import useSubscriptionPlan, { meetsPlanRequirement } from '../../hooks/useSubscriptionPlan';
import PlanTierBadge from '../billing/PlanTierBadge';
import SignOutButton from '../common/SignOutButton';

const PRO_SECTION_STORAGE_KEY = 'estateSidebar.proExpanded';
const ELITE_SECTION_STORAGE_KEY = 'estateSidebar.eliteExpanded';

export default function EstateSidebar() {
  const { user, userClaims } = useAuth();
  const [agentName, setAgentName] = useState(null);

  const agentId = userClaims?.agentId;

  // Fetch agent name when agentId is available
  useEffect(() => {
    async function fetchAgentName() {
      if (!agentId) {
        return;
      }
      
      try {
        const settings = await fetchEstateSettings();
        setAgentName(settings?.brandName || settings?.name || null);
      } catch (error) {
        console.error('[EstateSidebar] Error fetching agent name:', error);
      }
    }

    fetchAgentName();
  }, [agentId]);

  const isOwner = userClaims?.role === 'owner';
  const isManager = userClaims?.role === 'manager';
  const canManagePortal = isOwner || isManager;
  const { tier, tierLabel, loading: subscriptionLoading } = useSubscriptionPlan();
  const { pendingCount: teamPendingCount } = useTeamAccessPending({
    tenantType: 'real_estate',
    enabled: isOwner,
  });
  const professionalUnlocked = subscriptionLoading || meetsPlanRequirement(tier, 'professional');
  const eliteUnlocked = subscriptionLoading || meetsPlanRequirement(tier, 'elite');
  const [proExpanded, setProExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(PRO_SECTION_STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  });
  const [eliteExpanded, setEliteExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(ELITE_SECTION_STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  });

  useEffect(() => {
    if (subscriptionLoading || typeof window === 'undefined') return;
    if (window.localStorage.getItem(PRO_SECTION_STORAGE_KEY) === null) {
      setProExpanded(professionalUnlocked);
    }
    if (window.localStorage.getItem(ELITE_SECTION_STORAGE_KEY) === null) {
      setEliteExpanded(eliteUnlocked);
    }
  }, [eliteUnlocked, professionalUnlocked, subscriptionLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRO_SECTION_STORAGE_KEY, String(proExpanded));
  }, [proExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ELITE_SECTION_STORAGE_KEY, String(eliteExpanded));
  }, [eliteExpanded]);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 dark:bg-slate-900 dark:border-slate-700 flex-col h-screen">
      {/* Agent Name */}
      <div className="px-5 py-5 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <NavLink to="/estate" className="block">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏡</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
              {agentName || 'Agent'}
            </h1>
          </div>
          <div className="mt-1 ml-9 flex flex-wrap items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-slate-400">Powered by Merxus Real Estate</p>
            {!subscriptionLoading ? <PlanTierBadge tier={tier} label={tierLabel} /> : null}
          </div>
        </NavLink>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/estate" label="Dashboard" icon="📊" />
        <NavItem to="/estate/listings" label="Listings" icon="🏠" />
        <NavItem to="/estate/leads" label="Leads" icon="👥" />
        <NavItem to="/estate/showings" label="Showings" icon="📅" />
        <NavItem to="/estate/calls" label="Calls & Messages" icon="📞" />
        <NavItem to="/estate/sms" label="SMS Inbox" icon="💬" />
        <NavItem to="/estate/command-center" label="Command Center" icon="🛰️" />
        <NavItem to="/estate/notifications" label="Notifications" icon="🔔" />
        <NavItem to="/estate/flyers/metrics" label="Flyer Analytics" icon="📊" />
        {canManagePortal && <NavItem to="/estate/settings" label="Settings" icon="⚙️" />}
        {canManagePortal && <NavItem to="/estate/billing" label="Billing" icon="💳" />}
        {isOwner && (
          <NavItem
            to="/estate/users"
            label="Team & Access"
            icon="👤"
            attentionCount={teamPendingCount}
          />
        )}
        <PlanSection
          title="Pro Features"
          tier="professional"
          label="Pro"
          summary="Pipeline insight"
          expanded={proExpanded}
          onToggle={() => setProExpanded((value) => !value)}
        >
          <NavItem
            to="/estate/intelligence"
            label="Intelligence"
            icon="🧠"
            locked={!professionalUnlocked}
            lockedPath="/estate/billing?requiredTier=professional&from=%2Festate%2Fintelligence"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
          <NavItem
            to="/estate/customer-360"
            label="Customer 360"
            icon="🪪"
            locked={!professionalUnlocked}
            lockedPath="/estate/billing?requiredTier=professional&from=%2Festate%2Fcustomer-360"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
          <NavItem
            to="/estate/merge-activity"
            label="Merge Activity"
            icon="🔀"
            locked={!professionalUnlocked}
            lockedPath="/estate/billing?requiredTier=professional&from=%2Festate%2Fmerge-activity"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
        </PlanSection>
        <PlanSection
          title="Elite Features"
          tier="elite"
          label="Elite"
          summary="Includes Pro"
          expanded={eliteExpanded}
          onToggle={() => setEliteExpanded((value) => !value)}
        >
          <NavItem
            to="/estate/reviews"
            label="Reviews"
            icon="⭐"
            locked={!eliteUnlocked}
            lockedPath="/estate/billing?requiredTier=elite&from=%2Festate%2Freviews"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
          <NavItem
            to="/estate/feedback"
            label="Feedback"
            icon="🗣️"
            locked={!eliteUnlocked}
            lockedPath="/estate/billing?requiredTier=elite&from=%2Festate%2Ffeedback"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
          <NavItem
            to="/estate/automations"
            label="Automations"
            icon="⚡"
            locked={!eliteUnlocked}
            lockedPath="/estate/billing?requiredTier=elite&from=%2Festate%2Fautomations"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
          <NavItem
            to="/estate/cx-analytics"
            label="CX Analytics"
            icon="📈"
            locked={!eliteUnlocked}
            lockedPath="/estate/billing?requiredTier=elite&from=%2Festate%2Fcx-analytics"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
        </PlanSection>
      </nav>

      {/* User Info - Sticky at Bottom */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
              {user?.displayName || user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
              {userClaims?.role || 'User'}
            </p>
          </div>
        </div>
        <SignOutButton
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          Sign Out
        </SignOutButton>
      </div>
    </aside>
  );
}

function PlanSection({ title, tier, label, summary = '', expanded, onToggle, children }) {
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{title}</span>
            <PlanTierBadge tier={tier} label={label} />
          </span>
          <span className={`text-base text-gray-400 dark:text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
        </span>
        {summary ? <span className="mt-0.5 block normal-case tracking-normal text-slate-400">{summary}</span> : null}
      </button>
      {expanded ? <div className="mt-1 space-y-1">{children}</div> : null}
    </div>
  );
}

function NavItem({
  to,
  label,
  icon,
  attentionCount = 0,
  locked = false,
  lockedPath = '',
  planBadgeLabel = '',
  planBadgeTier = 'professional',
}) {
  return (
    <NavLink
      to={locked ? lockedPath || to : to}
      className={({ isActive }) => {
        if (attentionCount > 0) {
          return `flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'border-l-4 border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
              : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40'
          }`;
        }

        if (locked) {
          return `flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200'
          }`;
        }

        return `flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'border-l-4 border-green-600 bg-green-50 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200'
        }`;
      }}
    >
      <span className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span>{label}</span>
      </span>
      {attentionCount > 0 ? (
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
          {attentionCount}
        </span>
      ) : locked && planBadgeLabel ? (
        <PlanTierBadge tier={planBadgeTier} label={planBadgeLabel} />
      ) : null}
    </NavLink>
  );
}

