import { useEffect, useState } from 'react';
import { fetchSystemAnalytics } from '../../api/merxus';

export default function AnalyticsPage() {
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
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
        <p className="text-gray-600 mt-2">
          System-wide statistics and insights
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Restaurants"
          value={analytics?.totalRestaurants || 0}
          change="+12%"
          positive
        />
        <StatCard
          title="Total Orders"
          value={analytics?.totalOrders || 0}
          change="+8%"
          positive
        />
        <StatCard
          title="Total Calls"
          value={analytics?.totalCalls || 0}
          change="+15%"
          positive
        />
        <StatCard
          title="Active Users"
          value={analytics?.activeUsers || 0}
          change="+5%"
          positive
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            <StatRow label="Pending" value={analytics?.ordersByStatus?.pending || 0} />
            <StatRow label="Confirmed" value={analytics?.ordersByStatus?.confirmed || 0} />
            <StatRow label="Preparing" value={analytics?.ordersByStatus?.preparing || 0} />
            <StatRow label="Ready" value={analytics?.ordersByStatus?.ready || 0} />
            <StatRow label="Completed" value={analytics?.ordersByStatus?.completed || 0} />
            <StatRow label="Cancelled" value={analytics?.ordersByStatus?.cancelled || 0} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Type</h3>
          <div className="space-y-3">
            <StatRow label="Dine-in" value={analytics?.ordersByType?.dineIn || 0} />
            <StatRow label="Takeout" value={analytics?.ordersByType?.takeout || 0} />
            <StatRow label="Delivery" value={analytics?.ordersByType?.delivery || 0} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Statistics</h3>
          <div className="space-y-3">
            <StatRow label="Total Calls" value={analytics?.totalCalls || 0} />
            <StatRow label="Calls This Month" value={analytics?.callsThisMonth || 0} />
            <StatRow label="Avg Call Duration" value={`${analytics?.avgCallDuration || 0} min`} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
          <div className="space-y-3">
            <StatRow label="Total Users" value={analytics?.totalUsers || 0} />
            <StatRow label="Active Users" value={analytics?.activeUsers || 0} />
            <StatRow label="Owners" value={analytics?.usersByRole?.owner || 0} />
            <StatRow label="Managers" value={analytics?.usersByRole?.manager || 0} />
            <StatRow label="Staff" value={analytics?.usersByRole?.staff || 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, positive }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {change && (
          <span
            className={`text-xs font-medium ${
              positive ? 'text-primary-600' : 'text-red-600'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

