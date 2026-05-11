import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchSettings } from '../../api/settings';
import useTeamAccessPending from '../../hooks/useTeamAccessPending';
import useSubscriptionPlan, { meetsPlanRequirement } from '../../hooks/useSubscriptionPlan';
import QuickStartSidebar from './QuickStartSidebar';

export default function Sidebar({ mobile = false }) {
  const { user, userClaims } = useAuth();
  const [restaurantName, setRestaurantName] = useState(null);
  const restaurantId = userClaims?.restaurantId;
  const isOwner = userClaims?.role === 'owner';
  const { tier, tierLabel, loading: subscriptionLoading } = useSubscriptionPlan();
  const { pendingCount: teamPendingCount } = useTeamAccessPending({
    tenantType: 'restaurant',
    enabled: isOwner,
  });

  useEffect(() => {
    async function fetchRestaurantName() {
      if (!restaurantId) return;
      try {
        const settings = await fetchSettings();
        setRestaurantName(settings?.name || null);
      } catch (error) {
        console.error('[Sidebar] Error fetching restaurant name:', error);
      }
    }

    fetchRestaurantName();
  }, [restaurantId]);

  return (
    <QuickStartSidebar
      user={user}
      userClaims={userClaims}
      tenantType="restaurant"
      homePath="/restaurant"
      tenantIcon="🍽️"
      tenantName={restaurantName || 'Restaurant'}
      subtitle="Powered by Merxus"
      tier={tier}
      tierLabel={tierLabel}
      subscriptionLoading={subscriptionLoading}
      professionalUnlocked={subscriptionLoading || meetsPlanRequirement(tier, 'professional')}
      eliteUnlocked={subscriptionLoading || meetsPlanRequirement(tier, 'elite')}
      attentionCounts={{
        restaurant_team_access: teamPendingCount,
      }}
      mobile={mobile}
    />
  );
}
