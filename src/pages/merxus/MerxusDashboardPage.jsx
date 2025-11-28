import { useEffect, useState } from 'react';
import { fetchSystemAnalytics } from '../../api/merxus';
import { useAuth } from '../../context/AuthContext';

export default function MerxusDashboardPage() {
  const { user, userClaims } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Restaurants"
          value={analytics?.totalRestaurants || 0}
          subtitle="Active accounts"
          icon="🏪"
        />
        <StatCard
          title="Total Orders"
          value={analytics?.totalOrders || 0}
          subtitle="All time"
          icon="📦"
        />
        <StatCard
          title="Total Calls"
          value={analytics?.totalCalls || 0}
          subtitle="This month"
          icon="📞"
        />
        <StatCard
          title="Active Users"
          value={analytics?.activeUsers || 0}
          subtitle="Across all restaurants"
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

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-sm text-gray-600">
          Activity feed coming soon...
        </div>
      </div>
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
