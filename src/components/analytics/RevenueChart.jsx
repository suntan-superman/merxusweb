// Revenue Chart Component
// Displays revenue trends over time with daily/weekly/monthly views

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const COLORS = {
  revenue: '#10b981',
  orders: '#3b82f6',
  avg: '#8b5cf6',
  grid: '#e5e7eb',
};

export default function RevenueChart({ 
  orders = [], 
  title = 'Revenue Trend', 
  className = '' 
}) {
  const [range, setRange] = useState('7days'); // 7days, 30days, 90days
  const [chartType, setChartType] = useState('area'); // area, bar

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

  // Get order date
  const getOrderDate = (order) => {
    return parseDate(order.createdAt || order.orderDate);
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
      dayMap[dateStr] = { 
        date: dateStr, 
        revenue: 0, 
        orders: 0,
        items: 0,
      };
    }

    // Cutoff date
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Aggregate orders by day
    orders.forEach((order) => {
      const orderDate = getOrderDate(order);
      if (orderDate && orderDate >= cutoffDate) {
        const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dayMap[dateStr]) {
          // Calculate order total
          let orderTotal = order.total || order.orderTotal || 0;
          
          // If no total, calculate from items
          if (!orderTotal && order.items) {
            orderTotal = order.items.reduce((sum, item) => {
              const itemPrice = item.price || item.unitPrice || 0;
              const quantity = item.quantity || 1;
              return sum + (itemPrice * quantity);
            }, 0);
          }
          
          dayMap[dateStr].revenue += orderTotal;
          dayMap[dateStr].orders++;
          dayMap[dateStr].items += (order.items?.length || 0);
        }
      }
    });

    return Object.values(dayMap);
  }, [orders, range]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgDailyRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
    const peakDay = chartData.reduce((max, d) => d.revenue > max.revenue ? d : max, { revenue: 0 });
    
    // Calculate growth (compare last 50% to first 50%)
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    const firstHalfRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
    const growth = firstHalfRevenue > 0 
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue * 100).toFixed(1)
      : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      avgDailyRevenue,
      peakDay,
      growth,
    };
  }, [chartData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          <p className="text-sm text-green-600">
            Revenue: <span className="font-semibold">{formatCurrency(data.revenue)}</span>
          </p>
          <p className="text-sm text-blue-600">
            Orders: <span className="font-semibold">{data.orders}</span>
          </p>
          {data.orders > 0 && (
            <p className="text-sm text-gray-500">
              Avg: {formatCurrency(data.revenue / data.orders)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (orders.length === 0) {
    return (
      <div className={`card ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <p>No orders yet to analyze</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">
            {stats.totalOrders} orders • {formatCurrency(stats.totalRevenue)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="7days">7 Days</option>
            <option value="30days">30 Days</option>
            <option value="90days">90 Days</option>
          </select>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setChartType('area')}
              className={`px-2 py-1 text-xs ${chartType === 'area' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-2 py-1 text-xs ${chartType === 'bar' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Total Revenue</p>
          <p className="text-lg font-bold text-green-900">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Avg Order Value</p>
          <p className="text-lg font-bold text-blue-900">{formatCurrency(stats.avgOrderValue)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Daily Avg</p>
          <p className="text-lg font-bold text-purple-900">{formatCurrency(stats.avgDailyRevenue)}</p>
        </div>
        <div className={`${Number(stats.growth) >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg p-3`}>
          <p className={`text-xs font-medium ${Number(stats.growth) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Growth
          </p>
          <p className={`text-lg font-bold ${Number(stats.growth) >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
            {Number(stats.growth) >= 0 ? '+' : ''}{stats.growth}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                interval={range === '7days' ? 0 : range === '30days' ? 4 : 10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke={COLORS.revenue} 
                strokeWidth={2}
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                interval={range === '7days' ? 0 : range === '30days' ? 4 : 10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
