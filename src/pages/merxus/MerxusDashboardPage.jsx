import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSystemAnalytics } from '../../api/merxus';
import { useAuth } from '../../context/AuthContext';
import AnalyticsSummaryPanel from '../../components/dashboard/AnalyticsSummaryPanel';
import AnalyticsActivityFeedPanel from '../../components/dashboard/AnalyticsActivityFeedPanel';
import SystemOperationsConsolePanel from '../../components/dashboard/SystemOperationsConsolePanel';
import {
  SystemExecutiveSummaryPanel,
  SystemHistoryBucketsPanel,
  SystemTenantPressureHistoryPanel,
  SystemReportingNarrativesPanel,
  SystemRemediationQueuePanel,
} from '../../components/dashboard/SystemCrossTenantPanel';

export default function MerxusDashboardPage() {
  const navigate = useNavigate();
  const { user, userClaims } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Smart redirect: Send users to their tenant-specific dashboard
  useEffect(() => {
    if (userClaims && userClaims.type) {
      const tenantType = userClaims.type;
      
      // Only redirect if NOT a merxus admin (merxus admins can see this page)
      if (tenantType !== 'merxus') {
        console.log('Redirecting non-admin user to tenant dashboard:', tenantType);
        
        const redirectPaths = {
          restaurant: '/restaurant/dashboard',
          voice: '/voice/dashboard',
          real_estate: '/estate/dashboard',
        };
        
        const targetPath = redirectPaths[tenantType];
        if (targetPath) {
          navigate(targetPath, { replace: true });
          return;
        }
      }
    }
  }, [userClaims, navigate]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSystemAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Merxus Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome{user?.displayName ? `, ${user.displayName}` : ''}! System overview and management.
        </p>
      </div>

      <AnalyticsSummaryPanel
        analytics={analytics}
        title="System Operations"
        subtitle="Cleaned-up platform health signals for admin triage, pulled from the live Merxus analytics payload."
        emptyCopy="System analytics summary is not available yet."
      />

      <SystemExecutiveSummaryPanel crossTenant={analytics?.crossTenant} />

      <SystemOperationsConsolePanel analytics={analytics} />

      <SystemRemediationQueuePanel crossTenant={analytics?.crossTenant} />

      <SystemTenantPressureHistoryPanel crossTenant={analytics?.crossTenant} />

      <SystemReportingNarrativesPanel reporting={analytics?.reporting} />

      <SystemHistoryBucketsPanel reporting={analytics?.reporting} windowDays={30} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tenant Accounts"
          value={analytics?.crossTenant?.executive?.totalAccounts || 0}
          subtitle="Restaurant, voice, and real-estate accounts"
          icon="🏪"
        />
        <StatCard
          title="Attention Signals"
          value={analytics?.crossTenant?.executive?.totalAttentionSignals || 0}
          subtitle="Combined sync, push, scheduler, and alert pressure"
          icon="📦"
        />
        <StatCard
          title="Largest Segment"
          value={analytics?.crossTenant?.executive?.largestTenantType?.label || '—'}
          subtitle={analytics?.crossTenant?.executive?.largestTenantType ? `${analytics.crossTenant.executive.largestTenantType.accounts || 0} accounts` : 'Awaiting tenant mix data'}
          icon="📞"
        />
        <StatCard
          title="Recommended Focus"
          value={analytics?.crossTenant?.executive?.recommendedFocus?.label || 'Stable'}
          subtitle={analytics?.crossTenant?.executive?.recommendedFocus ? `${analytics.crossTenant.executive.recommendedFocus.attentionSignals || 0} signals need follow-up` : 'No urgent segment pressure'}
          icon="👥"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
          title="Create Restaurant"
          description="Add a new restaurant account"
          link="/merxus/restaurants/new"
          icon="➕"
        />
        <QuickActionCard
          title="Manage Restaurants"
          description="View and manage all restaurant accounts"
          link="/merxus/restaurants"
          icon="🏪"
        />
        <QuickActionCard
          title="System Analytics"
          description="View detailed system-wide statistics"
          link="/merxus/analytics"
          icon="📈"
        />
        <QuickActionCard
          title="Production Readiness"
          description="Review deploy blockers, env gaps, and live validation tasks"
          link="/merxus/production-readiness"
          icon="🧪"
        />
        <QuickActionCard
          title="Ops Audit"
          description="Open the consolidated cross-tenant operational audit workspace"
          link="/merxus/ops-audit"
          icon="🛠️"
        />
        {userClaims?.role === 'merxus_admin' && (
          <>
            <QuickActionCard
              title="System Settings"
              description="Configure system-wide settings"
              link="/merxus/settings"
              icon="⚙️"
            />
            <QuickActionCard
              title="User Management"
              description="Manage Merxus admin users"
              link="/merxus/users"
              icon="👤"
            />
          </>
        )}
      </div>

      <AnalyticsActivityFeedPanel
        analytics={analytics}
        title="Recent Activity"
        subtitle="The latest tenant, scheduler, sync, and remediation events flowing into the admin console."
        emptyCopy="No recent system activity has been recorded yet."
      />
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="text-4xl opacity-20">{icon}</div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, link, icon }) {
  return (
    <a
      href={link}
      className="card hover:shadow-lg transition-shadow cursor-pointer block"
    >
      <div className="flex items-start space-x-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </a>
  );
}
