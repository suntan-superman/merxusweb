// Flyer Metrics Dashboard Component
// Displays flyer send metrics, success rates, and quick actions

import { useState, useEffect } from 'react';
import { fetchFlyerMetrics, fetchFlyerLogs, fetchFlyerQueue } from '../../api/estate';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function FlyerMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [metricsResult, logsResult] = await Promise.allSettled([
        fetchFlyerMetrics(),
        fetchFlyerLogs({ limit: 5 }),
      ]);

      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value);
      } else {
        console.error('Failed to load flyer metrics:', metricsResult.reason);
        toast.error('Failed to load flyer metrics');
      }

      if (logsResult.status === 'fulfilled') {
        setRecentLogs(logsResult.value);
      } else {
        console.error('Failed to load flyer logs:', logsResult.reason);
        setRecentLogs([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadData();
      toast.success('Metrics refreshed');
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const total = metrics.sent + metrics.pending + metrics.failed + metrics.declined;
  const successRate = total > 0 ? ((metrics.sent / total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">📧 Flyer Metrics</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Track flyer sends, approvals, and success rates
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary"
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sent Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Sent</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{metrics.sent}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <p className="text-xs text-green-700 mt-2">
            Successfully delivered to prospects
          </p>
        </div>

        {/* Pending Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{metrics.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          {metrics.pending > 0 ? (
            <Link
              to="/estate/flyers/approvals"
              className="text-xs text-yellow-700 hover:text-yellow-900 underline mt-2 inline-block"
            >
              Review pending approvals →
            </Link>
          ) : (
            <p className="text-xs text-yellow-700 mt-2">All caught up!</p>
          )}
        </div>

        {/* Failed Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Failed</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{metrics.failed}</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
          {metrics.failed > 0 ? (
            <p className="text-xs text-red-700 mt-2 font-semibold">
              ⚠️ Requires attention
            </p>
          ) : (
            <p className="text-xs text-red-700 mt-2">No failures</p>
          )}
        </div>

        {/* Declined Card */}
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Declined</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.declined}</p>
            </div>
            <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚫</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-700 dark:text-slate-300">
            Agent declined to send
          </p>
        </div>
      </div>

      {/* Success Rate Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Success Rate</h4>
          <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{successRate}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${successRate}%` }}
          ></div>
        </div>
        <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">
          {metrics.sent} sent out of {total} total requests
        </p>
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Recent Activity</h4>
            <Link
              to="/estate/leads"
              className="text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 dark:border-slate-700"
              >
                <div className="flex-shrink-0 mt-1">
                  {log.status === 'sent' && <span className="text-green-500">✅</span>}
                  {log.status === 'pending' && <span className="text-yellow-500">⏳</span>}
                  {log.status === 'failed' && <span className="text-red-500">❌</span>}
                  {log.status === 'declined' && <span className="text-gray-500 dark:text-slate-400">🚫</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                    {log.listingAddress || 'Unknown listing'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-300">
                    To: {log.recipientEmail || 'Unknown'} • {log.recipientName || 'Unknown'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {log.sentAt ? new Date(log.sentAt).toLocaleDateString() : 'Pending'}
                    {log.status === 'sent' && log.clickedAt && (
                      <span className="ml-2 text-green-600 font-semibold">
                        👆 Clicked
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert for Failed Sends */}
      {metrics.failed > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/50 dark:bg-red-900/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900">
                {metrics.failed} Failed Flyer {metrics.failed === 1 ? 'Send' : 'Sends'}
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-200">
                Some flyers failed to send. This may be due to invalid email addresses or email service issues.
                Review the failed sends in the Leads page.
              </p>
              <Link
                to="/estate/leads"
                className="mt-3 inline-block text-sm font-medium text-red-700 underline hover:text-red-900 dark:text-red-200 dark:hover:text-red-100"
              >
                Review failed sends →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-500/50 dark:from-slate-900 dark:to-slate-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-100">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Link to="/estate/listings" className="btn-secondary text-sm">
            📝 Manage Listings
          </Link>
          <Link to="/estate/leads" className="btn-secondary text-sm">
            👥 View All Leads
          </Link>
          {metrics.pending > 0 && (
            <Link to="/estate/flyers/approvals" className="btn-primary text-sm">
              ⏳ Review Approvals ({metrics.pending})
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
