import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { fetchVoiceSettings } from '../../api/voice';
import useTeamAccessPending from '../../hooks/useTeamAccessPending';
import useSubscriptionPlan, { meetsPlanRequirement } from '../../hooks/useSubscriptionPlan';
import PlanTierBadge from '../billing/PlanTierBadge';

export default function VoiceSidebar() {
  const { user, userClaims } = useAuth();
  const navigate = useNavigate();
  const [officeName, setOfficeName] = useState(null);

  const officeId = userClaims?.officeId;

  // Fetch office name when officeId is available
  useEffect(() => {
    async function fetchOfficeName() {
      if (!officeId) {
        return;
      }
      
      try {
        const settings = await fetchVoiceSettings();
        setOfficeName(settings?.name || null);
      } catch (error) {
        console.error('[VoiceSidebar] Error fetching office name:', error);
      }
    }

    fetchOfficeName();
  }, [officeId]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isOwner = userClaims?.role === 'owner';
  const isManager = userClaims?.role === 'manager';
  const canManagePortal = isOwner || isManager;
  const { tier, tierLabel, loading: subscriptionLoading } = useSubscriptionPlan();
  const { pendingCount: teamPendingCount } = useTeamAccessPending({
    tenantType: 'voice',
    enabled: isOwner,
  });
  const professionalUnlocked = subscriptionLoading || meetsPlanRequirement(tier, 'professional');
  const eliteUnlocked = subscriptionLoading || meetsPlanRequirement(tier, 'elite');
  const [proExpanded, setProExpanded] = useState(true);
  const [eliteExpanded, setEliteExpanded] = useState(true);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen">
      {/* Office Name */}
      <div className="px-5 py-5 border-b border-gray-200 flex-shrink-0">
        <NavLink to="/voice" className="block">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📞</span>
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {officeName || 'Office'}
            </h1>
          </div>
          <div className="mt-1 ml-9 flex flex-wrap items-center gap-2">
            <p className="text-xs text-gray-500">Powered by Merxus Voice</p>
            {!subscriptionLoading ? <PlanTierBadge tier={tier} label={tierLabel} /> : null}
          </div>
        </NavLink>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/voice" label="Dashboard" icon="📊" />
        <NavItem to="/voice/calls" label="Calls & Messages" icon="📞" />
        <NavItem to="/voice/voicemail" label="Voicemail" icon="📬" />
        <NavItem to="/voice/sms" label="SMS Inbox" icon="💬" />
        <NavItem to="/voice/command-center" label="Command Center" icon="🛰️" />
        <NavItem to="/voice/notifications" label="Notifications" icon="🔔" />
        {canManagePortal && <NavItem to="/voice/routing" label="Call Routing" icon="🔄" />}
        <PlanSection
          title="Pro Features"
          tier="professional"
          label="Pro"
          expanded={proExpanded}
          onToggle={() => setProExpanded((value) => !value)}
        >
          <NavItem
            to="/voice/intelligence"
            label="Intelligence"
            icon="🧠"
            locked={!professionalUnlocked}
            lockedPath="/voice/billing?requiredTier=professional&from=%2Fvoice%2Fintelligence"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
          <NavItem
            to="/voice/work-items"
            label="Work Items"
            icon="🧾"
            locked={!professionalUnlocked}
            lockedPath="/voice/billing?requiredTier=professional&from=%2Fvoice%2Fwork-items"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
          <NavItem
            to="/voice/customer-360"
            label="Customer 360"
            icon="🪪"
            locked={!professionalUnlocked}
            lockedPath="/voice/billing?requiredTier=professional&from=%2Fvoice%2Fcustomer-360"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
          <NavItem
            to="/voice/merge-activity"
            label="Merge Activity"
            icon="🔀"
            locked={!professionalUnlocked}
            lockedPath="/voice/billing?requiredTier=professional&from=%2Fvoice%2Fmerge-activity"
            planBadgeLabel="Pro"
            planBadgeTier="professional"
          />
        </PlanSection>
        <PlanSection
          title="Elite Features"
          tier="elite"
          label="Elite"
          expanded={eliteExpanded}
          onToggle={() => setEliteExpanded((value) => !value)}
        >
          <NavItem
            to="/voice/reviews"
            label="Reviews"
            icon="⭐"
            locked={!eliteUnlocked}
            lockedPath="/voice/billing?requiredTier=elite&from=%2Fvoice%2Freviews"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
          <NavItem
            to="/voice/feedback"
            label="Feedback"
            icon="🗣️"
            locked={!eliteUnlocked}
            lockedPath="/voice/billing?requiredTier=elite&from=%2Fvoice%2Ffeedback"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
          <NavItem
            to="/voice/automations"
            label="Automations"
            icon="⚡"
            locked={!eliteUnlocked}
            lockedPath="/voice/billing?requiredTier=elite&from=%2Fvoice%2Fautomations"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
          <NavItem
            to="/voice/cx-analytics"
            label="CX Analytics"
            icon="📈"
            locked={!eliteUnlocked}
            lockedPath="/voice/billing?requiredTier=elite&from=%2Fvoice%2Fcx-analytics"
            planBadgeLabel="Elite"
            planBadgeTier="elite"
          />
        </PlanSection>
        {canManagePortal && <NavItem to="/voice/settings" label="Settings" icon="⚙️" />}
        {canManagePortal && <NavItem to="/voice/billing" label="Billing" icon="💳" />}
        {isOwner && (
          <NavItem
            to="/voice/users"
            label="Team & Access"
            icon="👤"
            attentionCount={teamPendingCount}
          />
        )}
      </nav>

      {/* User Info - Sticky at Bottom */}
      <div className="px-3 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {userClaims?.role || 'User'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function PlanSection({ title, tier, label, expanded, onToggle, children }) {
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <span>{title}</span>
          <PlanTierBadge tier={tier} label={label} />
        </span>
        <span className={`text-base text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          ›
        </span>
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
          return `flex items-center justify-between space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'border-l-4 border-amber-500 bg-amber-50 text-amber-800'
              : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100'
          }`;
        }

        if (locked) {
          return `flex items-center justify-between space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-800'
              : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
          }`;
        }

        return `flex items-center justify-between space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'border-l-4 border-green-600 bg-green-50 text-green-700'
            : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
        }`;
      }}
    >
      <span className="flex items-center space-x-3">
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

