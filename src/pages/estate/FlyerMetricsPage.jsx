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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Flyer Metrics</h1>
        <p className="text-gray-600 mt-2">Track your flyer campaigns and performance</p>
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
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {range === '7days' ? 'Last 7 Days' : range === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Sent</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.sent}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm font-medium">Pending</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.pending}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <p className="text-gray-600 text-sm font-medium">Failed</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.failed}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Approved</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.approved}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Success Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.successRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Line Chart - Flyers Over Time */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Flyers Sent Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="flyers" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Delivery Status</h3>
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
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[approvalData.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {})]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            {approvalData.map((entry, index) => (
              <Bar key={index} dataKey={entry.name} fill={entry.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Failed Flyers Alert */}
      {failedFlyers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-red-900 mb-4">Failed Sends Requiring Attention</h3>
          <div className="space-y-3">
            {failedFlyers.map((flyer) => (
              <div key={flyer.id} className="flex items-center justify-between bg-white p-4 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{flyer.property_address}</p>
                  <p className="text-sm text-gray-500">
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Flyers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Property</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date Sent</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Delivery Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Approval</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlyers.slice(0, 10).map((flyer) => (
                <tr key={flyer.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900">{flyer.property_address || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(flyer.createdAt?.toDate?.() || flyer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      flyer.status === 'sent' || flyer.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : flyer.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(flyer.status || 'pending').charAt(0).toUpperCase() + (flyer.status || 'pending').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      flyer.approval_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : flyer.approval_status === 'declined'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
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
