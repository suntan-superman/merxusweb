import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import VoiceFlyoverBanner, { markVoiceFlyoverComplete } from '../../components/voice/VoiceFlyoverBanner';
import VoiceFlyover from '../../components/voice/VoiceFlyover';
import FirstPortalChecklist from '../../components/onboarding/FirstPortalChecklist';
import { useVoiceSettings } from '../../hooks/useVoiceQueries';
import { CallVolumeChart, PeakHoursChart, ConversionChart } from '../../components/analytics';
import { fetchTenantAnalytics } from '../../api/merxus';
import AnalyticsSummaryPanel from '../../components/dashboard/AnalyticsSummaryPanel';
import AnalyticsActivityFeedPanel from '../../components/dashboard/AnalyticsActivityFeedPanel';
import TenantFeedbackTrendPanel from '../../components/dashboard/TenantFeedbackTrendPanel';

export default function VoiceDashboardPage() {
  const { user, userClaims, officeId } = useAuth();
  const canManagePortal = userClaims?.role === 'owner' || userClaims?.role === 'manager';
  
  // Flyover state
  const [flyoverOpen, setFlyoverOpen] = useState(false);
  const [tenantAnalytics, setTenantAnalytics] = useState(null);

  // Use React Query for voice settings (API call with caching)
  const { 
    data: voiceSettings, 
    isLoading: settingsLoading,
    refetch: refetchSettings 
  } = useVoiceSettings({
    enabled: !!officeId, // Only fetch when we have an officeId
  });

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
  // Use 'endedAt' for filtering to match VoiceCallsPage behavior
  const { data: calls = [], loading: callsLoading } = useFirestoreCollection(
    officeId ? 'callSessions' : null,
    officeId
      ? {
          where: [{ field: 'officeId', operator: '==', value: officeId }],
          orderBy: [{ field: 'endedAt', direction: 'desc' }],
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

    // Try multiple date field names (priority: endedAt > startedAt > createdAt)
    const getCallDate = (call) => {
      const dateField = call.endedAt || call.startedAt || call.createdAt;
      return parseDate(dateField);
    };

    // Debug: Log first call to see structure
    if (calls.length > 0) {
      console.log('📞 Sample call data:', {
        callId: calls[0].id,
        endedAt: calls[0].endedAt,
        startedAt: calls[0].startedAt,
        createdAt: calls[0].createdAt,
        hasVoicemail: calls[0].hasVoicemail,
        type: calls[0].type,
        voicemail: calls[0].voicemail,
        status: calls[0].status,
        parsedDate: getCallDate(calls[0]),
      });
      console.log('📅 Time filters:', {
        startOfToday: startOfToday.toISOString(),
        startOfWeek: startOfWeek.toISOString(),
        startOfMonth: startOfMonth.toISOString(),
        now: new Date().toISOString(),
      });
    }

    const todayCalls = calls.filter((call) => {
      const callDate = getCallDate(call);
      return callDate && callDate >= startOfToday;
    });

    const weekCalls = calls.filter((call) => {
      const callDate = getCallDate(call);
      return callDate && callDate >= startOfWeek;
    });

    const monthCalls = calls.filter((call) => {
      const callDate = getCallDate(call);
      return callDate && callDate >= startOfMonth;
    });

    // Calculate total duration in seconds
    const totalDuration = calls.reduce((sum, call) => {
      return sum + (call.durationSec || call.duration || 0);
    }, 0);

    const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    // Count missed calls (status === 'missed' or 'no-answer')
    const missedCalls = calls.filter((call) => {
      const status = (call.status || '').toLowerCase();
      return status === 'missed' || status === 'no-answer' || status === 'no_answer';
    }).length;

    // Count voicemails - match VoicemailPage logic
    // Voicemail = duration >= 20 seconds AND has transcript
    const voicemails = calls.filter((call) => {
      const hasDuration = call.durationSec && call.durationSec >= 20;
      const hasTranscript = call.transcript || 
                           call.callerTranscript || 
                           call.assistantTranscript;
      return hasDuration && hasTranscript;
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

  useEffect(() => {
    if (!officeId) {
      return undefined;
    }

    let mounted = true;

    async function loadTenantAnalytics() {
      try {
        const data = await fetchTenantAnalytics();
        if (mounted) {
          setTenantAnalytics(data);
        }
      } catch (error) {
        console.warn('Unable to load tenant analytics for dashboard:', error);
      }
    }

    loadTenantAnalytics();
    return () => {
      mounted = false;
    };
  }, [officeId]);

  // Handle flyover completion
  const handleFlyoverComplete = () => {
    markVoiceFlyoverComplete(officeId);
    // Refetch settings using React Query (automatic cache invalidation)
    refetchSettings();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Flyover Banner */}
      <VoiceFlyoverBanner 
        onStartFlyover={() => setFlyoverOpen(true)} 
        settings={voiceSettings}
        officeId={officeId}
      />

      {/* Flyover Modal */}
      <VoiceFlyover
        isOpen={flyoverOpen}
        onClose={() => setFlyoverOpen(false)}
        onComplete={handleFlyoverComplete}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}! Overview of your call activity and system status.
        </p>
      </div>

      <FirstPortalChecklist
        tenantType={userClaims?.type || 'voice'}
        tenantId={officeId}
        userId={user?.uid}
      />

      <AnalyticsSummaryPanel
        analytics={tenantAnalytics}
        title="Reputation & Operations"
        subtitle="Owner-grade review, recovery, push, and automation health layered into your office operations dashboard."
        emptyCopy="Tenant analytics are still loading for this dashboard."
      />

      <TenantFeedbackTrendPanel analytics={tenantAnalytics} />

      <AnalyticsActivityFeedPanel
        analytics={tenantAnalytics}
        title="Operational Activity"
        subtitle="The latest sync, alert, and recovery events flowing into the office operations dashboard."
        emptyCopy="No recent tenant activity has been recorded yet."
        limit={6}
      />

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
          <button
            onClick={() => setFlyoverOpen(true)}
            className="text-left p-4 border-2 border-dashed border-primary-300 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <h3 className="font-semibold text-primary-700 mb-1">✨ Setup Guide</h3>
            <p className="text-sm text-primary-600">Complete your AI assistant setup</p>
          </button>
          <Link
            to="/voice/calls"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">📞 View Calls</h3>
            <p className="text-sm text-gray-600">View call history and transcripts</p>
          </Link>
          {canManagePortal && (
            <Link
              to="/voice/settings"
              className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">⚙️ Settings</h3>
              <p className="text-sm text-gray-600">Configure business info and AI settings</p>
            </Link>
          )}
          <Link
            to="/voice/sms"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">💬 SMS Inbox</h3>
            <p className="text-sm text-gray-600">Review texts, follow-ups, and opt-outs</p>
          </Link>
          <Link
            to="/voice/work-items"
            className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">🧾 Work Items</h3>
            <p className="text-sm text-gray-600">Review appointments, quotes, and service requests</p>
          </Link>
          {canManagePortal && (
            <Link
              to="/voice/routing"
              className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">🔄 Call Routing</h3>
              <p className="text-sm text-gray-600">Set up department routing rules</p>
            </Link>
          )}
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

      {/* Analytics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">📊 Analytics</h2>
          <span className="text-sm text-gray-500">
            Based on {calls.length} calls
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CallVolumeChart calls={calls} title="Call Volume Trend" />
          <PeakHoursChart calls={calls} title="Peak Call Times" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <ConversionChart calls={calls} title="Call Outcomes" context="voice" />
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
