// Call Volume Chart Component
// Displays call volume trends over time (daily, weekly, monthly)

import { useMemo, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  grid: '#e5e7eb',
  text: '#6b7280',
};

export default function CallVolumeChart({ calls = [], title = 'Call Volume', className = '' }) {
  const [range, setRange] = useState('7days'); // 7days, 30days, 90days

  // Parse date from Firestore formats
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

  // Get call date with fallbacks
  const getCallDate = (call) => {
    return parseDate(call.endedAt || call.startedAt || call.createdAt);
  };

  // Calculate chart data based on range
  const chartData = useMemo(() => {
    const now = new Date();
    let days;
    
    switch (range) {
      case '7days':
        days = 7;
        break;
      case '30days':
        days = 30;
        break;
      case '90days':
        days = 90;
        break;
      default:
        days = 7;
    }

    // Initialize day map
    const dayMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap[dateStr] = { date: dateStr, calls: 0, duration: 0 };
    }

    // Cutoff date
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Count calls per day
    calls.forEach((call) => {
      const callDate = getCallDate(call);
      if (callDate && callDate >= cutoffDate) {
        const dateStr = callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dayMap[dateStr]) {
          dayMap[dateStr].calls++;
          dayMap[dateStr].duration += call.durationSec || call.duration || 0;
        }
      }
    });

    return Object.values(dayMap);
  }, [calls, range]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalCalls = chartData.reduce((sum, d) => sum + d.calls, 0);
    const totalDuration = chartData.reduce((sum, d) => sum + d.duration, 0);
    const avgPerDay = chartData.length > 0 ? Math.round(totalCalls / chartData.length) : 0;
    const peakDay = chartData.reduce((max, d) => d.calls > max.calls ? d : max, { calls: 0 });
    
    return { totalCalls, totalDuration, avgPerDay, peakDay };
  }, [chartData]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className={`min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {stats.totalCalls} calls · Avg {stats.avgPerDay}/day
          </p>
        </div>
        
        {/* Range Selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['7days', '30days', '90days'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                range === r
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {r === '7days' ? '7D' : r === '30days' ? '30D' : '90D'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 min-w-0 min-h-[16rem]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke={COLORS.text}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval={range === '7days' ? 0 : range === '30days' ? 4 : 13}
            />
            <YAxis 
              stroke={COLORS.text}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value, name) => [value, name === 'calls' ? 'Calls' : name]}
              labelFormatter={(label) => `${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="calls" 
              stroke={COLORS.primary} 
              strokeWidth={2}
              fill="url(#colorCalls)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-sm text-gray-500">Total Duration</p>
          <p className="text-lg font-semibold text-gray-900">{formatDuration(stats.totalDuration)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Peak Day</p>
          <p className="text-lg font-semibold text-gray-900">
            {stats.peakDay.calls > 0 ? stats.peakDay.date : '--'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Peak Calls</p>
          <p className="text-lg font-semibold text-gray-900">{stats.peakDay.calls || 0}</p>
        </div>
      </div>
    </div>
  );
}
