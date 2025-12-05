import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import FlyerMetricsDashboard from '../../components/estate/FlyerMetricsDashboard';

export default function EstateDashboardPage() {
  const { user, userClaims, agentId } = useAuth();
  
  // Calculate start of today for filtering
  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }, []);

  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  // Fetch calls from callSessions collection filtered by agentId
  const { data: calls = [], loading: callsLoading } = useFirestoreCollection(
    agentId ? 'callSessions' : null,
    agentId
      ? {
          where: [{ field: 'agentId', operator: '==', value: agentId }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
          limit: 500,
        }
      : {}
  );

  // Fetch listings
  const { data: listings = [], loading: listingsLoading } = useFirestoreCollection(
    agentId ? `agents/${agentId}/listings` : null
  );

  // Fetch leads
  const { data: leads = [], loading: leadsLoading } = useFirestoreCollection(
    agentId ? `agents/${agentId}/leads` : null
  );

  // Fetch showings
  const { data: showings = [], loading: showingsLoading } = useFirestoreCollection(
    agentId ? `agents/${agentId}/showings` : null
  );

  // Calculate stats
  const stats = useMemo(() => {
    const parseDate = (dateField) => {
      if (!dateField) return null;
      try {
        if (typeof dateField.toDate === 'function') {
          return dateField.toDate();
        } else if (dateField.seconds) {
          return new Date(dateField.seconds * 1000);
        } else if (dateField._seconds) {
          return new Date(dateField._seconds * 1000);
        } else {
          return new Date(dateField);
        }
      } catch {
        return null;
      }
    };

    const todayCalls = calls.filter((call) => {
      const dateField = call.startedAt || call.createdAt;
      const callDate = parseDate(dateField);
      return callDate && callDate >= startOfToday;
    });

    const weekCalls = calls.filter((call) => {
      const dateField = call.startedAt || call.createdAt;
      const callDate = parseDate(dateField);
      return callDate && callDate >= startOfWeek;
    });

    const monthCalls = calls.filter((call) => {
      const dateField = call.startedAt || call.createdAt;
      const callDate = parseDate(dateField);
      return callDate && callDate >= startOfMonth;
    });

    const totalDuration = calls.reduce((sum, call) => {
      return sum + (call.durationSec || call.duration || 0);
    }, 0);
    const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    const activeListings = listings.filter((l) => l.status === 'active').length;
    const pendingLeads = leads.filter((l) => l.priority === 'hot' || l.priority === 'warm').length;
    
    const todayShowings = showings.filter((showing) => {
      const dateField = showing.scheduled_date || showing.createdAt;
      const showingDate = parseDate(dateField);
      return showingDate && showingDate >= startOfToday && showingDate < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    return {
      totalCalls: calls.length,
      todayCalls: todayCalls.length,
      weekCalls: weekCalls.length,
      monthCalls: monthCalls.length,
      avgDuration,
      activeListings,
      pendingLeads,
      todayShowings,
    };
  }, [calls, listings, leads, showings, startOfToday, startOfWeek, startOfMonth]);

  if (callsLoading || listingsLoading || leadsLoading || showingsLoading) {
    return <LoadingSpinner />;
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateField) => {
    if (!dateField) return 'N/A';
    try {
      let date;
      if (typeof dateField.toDate === 'function') {
        date = dateField.toDate();
      } else if (dateField.seconds) {
        date = new Date(dateField.seconds * 1000);
      } else {
        date = new Date(dateField);
      }
      return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return 'Invalid Date';
    }
  };

  const recentCalls = calls.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your real estate business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Calls"
          value={stats.totalCalls}
          subtitle={`${stats.todayCalls} today`}
          icon="📞"
          color="blue"
        />
        <StatCard
          title="Active Listings"
          value={stats.activeListings}
          subtitle="Currently listed"
          icon="🏠"
          color="green"
        />
        <StatCard
          title="Pending Leads"
          value={stats.pendingLeads}
          subtitle="Hot & warm leads"
          icon="👥"
          color="amber"
        />
        <StatCard
          title="Today's Showings"
          value={stats.todayShowings}
          subtitle="Scheduled today"
          icon="📅"
          color="purple"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="This Week"
          value={stats.weekCalls}
          subtitle="Calls this week"
          icon="📊"
          color="gray"
        />
        <StatCard
          title="This Month"
          value={stats.monthCalls}
          subtitle="Calls this month"
          icon="📈"
          color="gray"
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          subtitle="Per call"
          icon="⏱️"
          color="gray"
        />
      </div>

      {/* Flyer Metrics Dashboard */}
      <FlyerMetricsDashboard />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/estate/listings"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-3xl mb-2">🏠</span>
            <span className="text-sm font-medium text-gray-700">Add Listing</span>
          </Link>
          <Link
            to="/estate/showings"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-3xl mb-2">📅</span>
            <span className="text-sm font-medium text-gray-700">Schedule Showing</span>
          </Link>
          <Link
            to="/estate/leads"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-3xl mb-2">👥</span>
            <span className="text-sm font-medium text-gray-700">View Leads</span>
          </Link>
          <Link
            to="/estate/settings"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-3xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </Link>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          <Link
            to="/estate/calls"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
          </Link>
        </div>
        <div className="p-6">
          {recentCalls.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No calls yet</p>
          ) : (
            <div className="space-y-4">
              {recentCalls.map((call) => {
                const customerName = call.customerName || call.parsedMessage?.name || 'Unknown';
                const customerPhone = call.customerPhone || call.from || '';
                return (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{customerName}</div>
                      <div className="text-sm text-gray-500">{customerPhone}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(call.startedAt || call.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-700">
                        {call.durationSec ? formatDuration(call.durationSec) : 'N/A'}
                      </div>
                      {call.transcriptSummary && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {call.transcriptSummary}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color] || colorClasses.gray}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

