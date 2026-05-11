import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchVoiceSettings } from '../../api/voice';
import useTeamAccessPending from '../../hooks/useTeamAccessPending';
import useSubscriptionPlan, { meetsPlanRequirement } from '../../hooks/useSubscriptionPlan';
import QuickStartSidebar from './QuickStartSidebar';

export default function VoiceSidebar() {
  const { user, userClaims } = useAuth();
  const [officeName, setOfficeName] = useState(null);
  const officeId = userClaims?.officeId;
  const isOwner = userClaims?.role === 'owner';
  const { tier, tierLabel, loading: subscriptionLoading } = useSubscriptionPlan();
  const { pendingCount: teamPendingCount } = useTeamAccessPending({
    tenantType: 'voice',
    enabled: isOwner,
  });

  useEffect(() => {
    async function fetchOfficeName() {
      if (!officeId) return;
      try {
        const settings = await fetchVoiceSettings();
        setOfficeName(settings?.name || null);
      } catch (error) {
        console.error('[VoiceSidebar] Error fetching office name:', error);
      }
    }

    fetchOfficeName();
  }, [officeId]);

  return (
    <QuickStartSidebar
      user={user}
      userClaims={userClaims}
      tenantType="voice"
      homePath="/voice"
      tenantIcon="📞"
      tenantName={officeName || 'Office'}
      subtitle="Powered by Merxus Voice"
      tier={tier}
      tierLabel={tierLabel}
      subscriptionLoading={subscriptionLoading}
      professionalUnlocked={subscriptionLoading || meetsPlanRequirement(tier, 'professional')}
      eliteUnlocked={subscriptionLoading || meetsPlanRequirement(tier, 'elite')}
      attentionCounts={{
        voice_team_access: teamPendingCount,
      }}
    />
  );
}
