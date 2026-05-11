import { useAuth } from '../../context/AuthContext';
import QuickStartSidebar from './QuickStartSidebar';

export default function MerxusSidebar({ mobile = false }) {
  const { user, userClaims } = useAuth();

  return (
    <QuickStartSidebar
      user={user}
      userClaims={userClaims}
      tenantType="merxus"
      homePath="/merxus"
      tenantIcon="🛠️"
      tenantName="Merxus AI"
      subtitle="Admin Console"
      tier="admin"
      tierLabel="Admin"
      subscriptionLoading={false}
      professionalUnlocked
      eliteUnlocked
      mobile={mobile}
    />
  );
}
