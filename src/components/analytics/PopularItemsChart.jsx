// Popular Items Chart Component
// Displays top ordered menu items from AI phone orders

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
];

export default function PopularItemsChart({ 
  orders = [], 
  title = 'Popular Items', 
  className = '' 
}) {
  const [showCount, setShowCount] = useState(8); // Top N items to show

  // Extract and count items from orders
  const itemsData = useMemo(() => {
    const itemCounts = {};
    const itemRevenue = {};

    orders.forEach((order) => {
      const items = order.items || order.orderItems || [];
      items.forEach((item) => {
        const name = item.name || item.itemName || 'Unknown Item';
        const quantity = item.quantity || 1;
        const price = item.price || item.unitPrice || 0;
        
        itemCounts[name] = (itemCounts[name] || 0) + quantity;
        itemRevenue[name] = (itemRevenue[name] || 0) + (price * quantity);
      });
    });

    return Object.entries(itemCounts)
      .map(([name, count]) => ({
        name: name.length > 20 ? name.substring(0, 18) + '...' : name,
        fullName: name,
        count,
        revenue: itemRevenue[name] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, showCount);
  }, [orders, showCount]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalItems = itemsData.reduce((sum, item) => sum + item.count, 0);
    const totalRevenue = itemsData.reduce((sum, item) => sum + item.revenue, 0);
    const avgItemPrice = totalItems > 0 ? totalRevenue / totalItems : 0;
    
    return {
      totalItems,
      totalRevenue,
      avgItemPrice,
      topItem: itemsData[0] || null,
    };
  }, [itemsData]);

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
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            Ordered: <span className="font-semibold">{data.count} times</span>
          </p>
          <p className="text-sm text-gray-600">
            Revenue: <span className="font-semibold">{formatCurrency(data.revenue)}</span>
          </p>
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

  if (itemsData.length === 0) {
    return (
      <div className={`card ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <p>No item data available in orders</p>
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
            Based on {orders.length} orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Show top</span>
          <select
            value={showCount}
            onChange={(e) => setShowCount(Number(e.target.value))}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Top Item</p>
          <p className="text-sm font-bold text-blue-900 truncate">
            {stats.topItem?.fullName || 'N/A'}
          </p>
          <p className="text-xs text-blue-600">
            {stats.topItem?.count || 0} orders
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Total Revenue</p>
          <p className="text-lg font-bold text-green-900">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-600 font-medium">Avg Item Price</p>
          <p className="text-lg font-bold text-amber-900">
            {formatCurrency(stats.avgItemPrice)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={itemsData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#374151', fontSize: 12 }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {itemsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
