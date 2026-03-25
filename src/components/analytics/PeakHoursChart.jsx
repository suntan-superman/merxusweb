// Peak Hours Chart Component
// Shows call distribution by hour of day to identify busy periods

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
  low: '#dbeafe',      // Light blue
  medium: '#60a5fa',   // Medium blue
  high: '#3b82f6',     // Primary blue
  peak: '#1d4ed8',     // Dark blue
  grid: '#e5e7eb',
  text: '#6b7280',
};

export default function PeakHoursChart({ calls = [], title = 'Peak Hours', className = '' }) {
  const [viewType, setViewType] = useState('hourly'); // hourly, dayOfWeek

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

  // Get call date
  const getCallDate = (call) => {
    return parseDate(call.startedAt || call.endedAt || call.createdAt);
  };

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
      shortLabel: i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
      calls: 0,
      duration: 0,
    }));

    calls.forEach((call) => {
      const callDate = getCallDate(call);
      if (callDate) {
        const hour = callDate.getHours();
        hours[hour].calls++;
        hours[hour].duration += call.durationSec || call.duration || 0;
      }
    });

    const maxCalls = Math.max(...hours.map(h => h.calls));
    return hours.map(h => ({
      ...h,
      intensity: maxCalls > 0 ? h.calls / maxCalls : 0,
    }));
  }, [calls]);

  // Day of week distribution
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, i) => ({
      day: i,
      name,
      calls: 0,
      duration: 0,
    }));

    calls.forEach((call) => {
      const callDate = getCallDate(call);
      if (callDate) {
        const day = callDate.getDay();
        days[day].calls++;
        days[day].duration += call.durationSec || call.duration || 0;
      }
    });

    const maxCalls = Math.max(...days.map(d => d.calls));
    return days.map(d => ({
      ...d,
      intensity: maxCalls > 0 ? d.calls / maxCalls : 0,
    }));
  }, [calls]);

  const currentData = viewType === 'hourly' ? hourlyData : dayOfWeekData;
  const dataKey = viewType === 'hourly' ? 'shortLabel' : 'name';

  // Get color based on intensity
  const getBarColor = (intensity) => {
    if (intensity < 0.25) return COLORS.low;
    if (intensity < 0.5) return COLORS.medium;
    if (intensity < 0.75) return COLORS.high;
    return COLORS.peak;
  };

  // Find peak times
  const peakInfo = useMemo(() => {
    if (viewType === 'hourly') {
      const sorted = [...hourlyData].sort((a, b) => b.calls - a.calls);
      const peak = sorted[0];
      return {
        label: peak?.label || '--',
        value: peak?.calls || 0,
      };
    } else {
      const sorted = [...dayOfWeekData].sort((a, b) => b.calls - a.calls);
      const peak = sorted[0];
      return {
        label: peak?.name || '--',
        value: peak?.calls || 0,
      };
    }
  }, [hourlyData, dayOfWeekData, viewType]);

  // Business hours summary (9 AM - 5 PM weekdays)
  const businessHoursStats = useMemo(() => {
    let businessHoursCalls = 0;
    let afterHoursCalls = 0;

    calls.forEach((call) => {
      const callDate = getCallDate(call);
      if (callDate) {
        const hour = callDate.getHours();
        const day = callDate.getDay();
        const isBusinessHour = day >= 1 && day <= 5 && hour >= 9 && hour < 17;
        if (isBusinessHour) {
          businessHoursCalls++;
        } else {
          afterHoursCalls++;
        }
      }
    });

    const total = businessHoursCalls + afterHoursCalls;
    return {
      businessHours: businessHoursCalls,
      afterHours: afterHoursCalls,
      businessPct: total > 0 ? Math.round((businessHoursCalls / total) * 100) : 0,
    };
  }, [calls]);

  return (
    <div className={`min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Peak: {peakInfo.label} ({peakInfo.value} calls)
          </p>
        </div>
        
        {/* View Type Selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewType('hourly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              viewType === 'hourly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Hour
          </button>
          <button
            onClick={() => setViewType('dayOfWeek')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              viewType === 'dayOfWeek'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Day
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 min-w-0 min-h-[14rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={currentData} 
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis 
              dataKey={dataKey}
              stroke={COLORS.text}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={viewType === 'hourly' ? 2 : 0}
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
              formatter={(value) => [value, 'Calls']}
              labelFormatter={(label) => viewType === 'hourly' ? `${label}` : label}
            />
            <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
              {currentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.intensity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Business Hours Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-sm text-gray-500">Business Hours</p>
          <p className="text-lg font-semibold text-gray-900">{businessHoursStats.businessHours}</p>
          <p className="text-xs text-gray-400">9 AM - 5 PM, Mon-Fri</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">After Hours</p>
          <p className="text-lg font-semibold text-gray-900">{businessHoursStats.afterHours}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">During Hours</p>
          <p className="text-lg font-semibold text-blue-600">{businessHoursStats.businessPct}%</p>
        </div>
      </div>
    </div>
  );
}
