import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Link } from 'react-router-dom';

export default function VoiceDashboardPage() {
  const { user, userClaims, officeId } = useAuth();
  
  // Calculate start of today for call filtering
  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Calculate start of this week (Sunday)
  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day; // Get Sunday of this week
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }, []);

  // Calculate start of this month
  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  // Fetch calls from callSessions collection filtered by officeId
  const { data: calls = [], loading: callsLoading } = useFirestoreCollection(
    officeId ? 'callSessions' : null,
    officeId
      ? {
          where: [{ field: 'officeId', operator: '==', value: officeId }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
          limit: 500,
        }
      : {}
  );

  // Calculate stats
  const stats = useMemo(() => {
    // Helper to parse date from Firestore Timestamp or regular date
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

    // Calculate total duration in seconds
    const totalDuration = calls.reduce((sum, call) => {
      return sum + (call.durationSec || call.duration || 0);
    }, 0);

    const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    // Count missed calls (status === 'missed' or 'no-answer')
    const missedCalls = calls.filter((call) => {
      const status = call.status?.toLowerCase();
      return status === 'missed' || status === 'no-answer' || status === 'no_answer';
    }).length;

    // Count voicemails (has voicemail flag or transcript indicates voicemail)
    const voicemails = calls.filter((call) => {
      return call.hasVoicemail || call.type === 'voicemail' || call.voicemail;
    }).length;

    return {
      totalCalls: calls.length,
      todayCalls: todayCalls.length,
      weekCalls: weekCalls.length,
      monthCalls: monthCalls.length,
      avgDuration,
      totalDuration,
      missedCalls,
      voicemails,
    };
  }, [calls, startOfToday, startOfWeek, startOfMonth]);

  const isLoading = callsLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}! Overview of your call activity and system status.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Calls"
          value={stats.totalCalls}
          subtitle="All time"
          icon="📞"
          isLoading={isLoading}
        />
        <StatCard
          title="Today's Calls"
          value={stats.todayCalls}
          subtitle="Calls today"
          icon="📅"
          isLoading={isLoading}
        />
        <StatCard
          title="This Week"
          value={stats.weekCalls}
          subtitle="Calls this week"
          icon="📊"
          isLoading={isLoading}
        />
        <StatCard
          title="This Month"
          value={stats.monthCalls}
          subtitle="Calls this month"
          icon="📈"
          isLoading={isLoading}
        />
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          subtitle="Average call length"
          icon="⏱️"
          isLoading={isLoading}
        />
        <StatCard
          title="Missed Calls"
          value={stats.missedCalls}
          subtitle="Calls not answered"
          icon="📵"
          isLoading={isLoading}
          variant={stats.missedCalls > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Voicemails"
          value={stats.voicemails}
          subtitle="Voicemail messages"
          icon="💬"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/voice/calls"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">📞 View Calls</h3>
            <p className="text-sm text-gray-600">View call history and transcripts</p>
          </Link>
          <Link
            to="/voice/settings"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">⚙️ Settings</h3>
            <p className="text-sm text-gray-600">Configure business info and AI settings</p>
          </Link>
          <Link
            to="/voice/call-routing"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">🔄 Call Routing</h3>
            <p className="text-sm text-gray-600">Set up department routing rules</p>
          </Link>
          <Link
            to="/voice/voicemail"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">💬 Voicemail</h3>
            <p className="text-sm text-gray-600">View and manage voicemail messages</p>
          </Link>
          {userClaims?.role === 'owner' && (
            <Link
              to="/voice/users"
              className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">👤 Team & Access</h3>
              <p className="text-sm text-gray-600">Manage team members and permissions</p>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Calls */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Calls</h2>
          {calls.length > 5 && (
            <Link
              to="/voice/calls"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all →
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-8 text-center">
              <LoadingSpinner text="Loading calls..." />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No calls yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Calls will appear here once your phone number receives calls
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caller
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    When
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.slice(0, 5).map((call) => {
                  const dateField = call.startedAt || call.createdAt;
                  const callDate = dateField?.toDate?.() || new Date(dateField);
                  const duration = call.durationSec || call.duration || 0;
                  
                  return (
                    <tr
                      key={call.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.location.href = '/voice/calls'}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {call.customerName || call.from || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {call.customerPhone || call.from || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {callDate.toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatDuration(duration)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          call.status === 'completed' || call.status === 'answered'
                            ? 'bg-green-100 text-green-800'
                            : call.status === 'missed' || call.status === 'no-answer'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {call.status || 'completed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">
                        {call.transcriptSummary || call.summary || 'No summary available'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Account Info */}
      {userClaims && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Role: <span className="font-medium text-gray-900">{userClaims.role}</span>
            </p>
            <p>
              Office ID: <span className="font-medium text-gray-900">{userClaims.officeId || 'N/A'}</span>
            </p>
            <p>
              Email: <span className="font-medium text-gray-900">{user?.email}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, isLoading, variant = 'default' }) {
  const variantStyles = {
    default: 'text-primary-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {isLoading ? (
            <LoadingSpinner text="" />
          ) : (
            <>
              <p className={`text-3xl font-bold ${variantStyles[variant]}`}>{value}</p>
              <p className="text-sm text-gray-600 mt-2">{subtitle}</p>
            </>
          )}
        </div>
        <div className="text-4xl opacity-20">{icon}</div>
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
