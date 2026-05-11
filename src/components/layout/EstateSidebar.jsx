import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchEstateSettings } from '../../api/estate';
import useTeamAccessPending from '../../hooks/useTeamAccessPending';
import useSubscriptionPlan, { meetsPlanRequirement } from '../../hooks/useSubscriptionPlan';
import QuickStartSidebar from './QuickStartSidebar';

export default function EstateSidebar({ mobile = false }) {
  const { user, userClaims } = useAuth();
  const [agentName, setAgentName] = useState(null);
  const agentId = userClaims?.agentId;
  const isOwner = userClaims?.role === 'owner';
  const { tier, tierLabel, loading: subscriptionLoading } = useSubscriptionPlan();
  const { pendingCount: teamPendingCount } = useTeamAccessPending({
    tenantType: 'real_estate',
    enabled: isOwner,
  });

  useEffect(() => {
    async function fetchAgentName() {
      if (!agentId) return;
      try {
        const settings = await fetchEstateSettings();
        setAgentName(settings?.brandName || settings?.name || null);
      } catch (error) {
        console.error('[EstateSidebar] Error fetching agent name:', error);
      }
    }

    fetchAgentName();
  }, [agentId]);

  return (
    <QuickStartSidebar
      user={user}
      userClaims={userClaims}
      tenantType="real_estate"
      homePath="/estate"
      tenantIcon="🏡"
      tenantName={agentName || 'Agent'}
      subtitle="Powered by Merxus Real Estate"
      tier={tier}
      tierLabel={tierLabel}
      subscriptionLoading={subscriptionLoading}
      professionalUnlocked={subscriptionLoading || meetsPlanRequirement(tier, 'professional')}
      eliteUnlocked={subscriptionLoading || meetsPlanRequirement(tier, 'elite')}
      attentionCounts={{
        estate_team_access: teamPendingCount,
      }}
      mobile={mobile}
    />
  );
}
