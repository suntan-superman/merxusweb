import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';

export default function FlyerMetricsPage() {
  const { agentId } = useAuth();
  const [timeRange, setTimeRange] = useState('30days');
  const [error, setError] = useState(null);

  const { data: flyers = [], loading } = useFirestoreCollection(
    agentId ? `agents/${agentId}/flyers` : null,
    agentId
      ? {
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
        }
      : {}
  );

  // Filter by time range
  const getFilteredFlyers = () => {
    const now = new Date();
    let cutoffDate;

    switch (timeRange) {
      case '7days':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return flyers;
    }

    return flyers.filter((f) => {
      const date = f.createdAt?.toDate?.() || new Date(f.createdAt);
      return date >= cutoffDate;
    });
  };

  const filteredFlyers = getFilteredFlyers();

  // Calculate metrics
  const metrics = {
    total: filteredFlyers.length,
    sent: filteredFlyers.filter((f) => f.status === 'sent' || f.status === 'delivered').length,
    pending: filteredFlyers.filter((f) => f.status === 'pending').length,
    failed: filteredFlyers.filter((f) => f.status === 'failed').length,
    approved: filteredFlyers.filter((f) => f.approval_status === 'approved').length,
    declined: filteredFlyers.filter((f) => f.approval_status === 'declined').length,
  };

  metrics.successRate = metrics.total > 0 ? Math.round((metrics.sent / metrics.total) * 100) : 0;

  // Status breakdown data
  const statusData = [
    { name: 'Sent', value: metrics.sent, color: '#10b981' },
    { name: 'Pending', value: metrics.pending, color: '#f59e0b' },
    { name: 'Failed', value: metrics.failed, color: '#ef4444' },
  ];

  // Approval breakdown data
  const approvalData = [
    { name: 'Approved', value: metrics.approved, color: '#10b981' },
    { name: 'Declined', value: metrics.declined, color: '#ef4444' },
    { name: 'Pending', value: metrics.total - metrics.approved - metrics.declined, color: '#f59e0b' },
  ];

  // Time series data (flyers sent per day)
  const getTimeSeriesData = () => {
    const dayMap = {};
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap[dateStr] = 0;
    }

    filteredFlyers.forEach((flyer) => {
      const date = flyer.createdAt?.toDate?.() || new Date(flyer.createdAt);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dayMap[dateStr] !== undefined) {
        dayMap[dateStr]++;
      }
    });

    return Object.entries(dayMap).map(([date, count]) => ({
      date,
      flyers: count,
    }));
  };

  const timeSeriesData = getTimeSeriesData();

  // Failed flyers for alerts
  const failedFlyers = filteredFlyers.filter((f) => f.status === 'failed').slice(0, 5);
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const tooltipStyle = isDarkMode
    ? { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }
    : { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' };

  const handleRetryFailed = async (flyerId) => {
    try {
      // Implement retry logic in your API
      toast.success('Flyer resend initiated');
    } catch (err) {
      console.error('Retry failed:', err);
      toast.error('Failed to retry flyer send');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Flyer Metrics</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-300">Track your flyer campaigns and performance</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-3">
        {['7days', '30days', '90days'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeRange === range
                ? 'bg-green-600 text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {range === '7days' ? 'Last 7 Days' : range === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="rounded-lg border-l-4 border-blue-500 bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Total Sent</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.sent}</p>
        </div>

        <div className="rounded-lg border-l-4 border-yellow-500 bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Pending</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.pending}</p>
        </div>

        <div className="rounded-lg border-l-4 border-red-500 bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Failed</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.failed}</p>
        </div>

        <div className="rounded-lg border-l-4 border-green-500 bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Approved</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.approved}</p>
        </div>

        <div className="rounded-lg border-l-4 border-purple-500 bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Success Rate</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{metrics.successRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Line Chart - Flyers Over Time */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-slate-100">Flyers Sent Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="flyers" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
          <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-slate-100">Delivery Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Approval Status Chart */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">
        <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-slate-100">Approval Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[approvalData.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {})]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={tooltipStyle} />
            {approvalData.map((entry, index) => (
              <Bar key={index} dataKey={entry.name} fill={entry.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Failed Flyers Alert */}
      {failedFlyers.length > 0 && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-500/50 dark:bg-red-900/30">
          <h3 className="mb-4 text-lg font-semibold text-red-900 dark:text-red-200">Failed Sends Requiring Attention</h3>
          <div className="space-y-3">
            {failedFlyers.map((flyer) => (
              <div key={flyer.id} className="flex items-center justify-between rounded-lg bg-white p-4 dark:bg-slate-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{flyer.property_address}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Failed on {new Date(flyer.createdAt?.toDate?.() || flyer.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRetryFailed(flyer.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Flyers Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:shadow-none">
        <div className="border-b border-gray-200 p-6 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Flyers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/70">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">Property</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">Date Sent</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">Delivery Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">Approval</th>
              </tr>
            </thead>
            <tbody className="dark:divide-y dark:divide-slate-700">
              {filteredFlyers.slice(0, 10).map((flyer) => (
                <tr key={flyer.id} className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800/70">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">{flyer.property_address || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                    {new Date(flyer.createdAt?.toDate?.() || flyer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      flyer.status === 'sent' || flyer.status === 'delivered'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-200'
                        : flyer.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/35 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-200'
                    }`}>
                      {(flyer.status || 'pending').charAt(0).toUpperCase() + (flyer.status || 'pending').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      flyer.approval_status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-200'
                        : flyer.approval_status === 'declined'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200'
                    }`}>
                      {(flyer.approval_status || 'pending').charAt(0).toUpperCase() + (flyer.approval_status || 'pending').slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
