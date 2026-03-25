// Lead Source Chart Component
// Shows breakdown of leads by source (phone, web, referral, etc.)

import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const SOURCE_COLORS = {
  phone: '#3b82f6',      // Blue
  call: '#3b82f6',       // Blue (alias)
  web: '#10b981',        // Green
  website: '#10b981',    // Green (alias)
  referral: '#8b5cf6',   // Purple
  signage: '#f59e0b',    // Amber
  sign: '#f59e0b',       // Amber (alias)
  flyer: '#ec4899',      // Pink
  'open house': '#06b6d4', // Cyan
  openhouse: '#06b6d4',  // Cyan (alias)
  zillow: '#ef4444',     // Red
  realtor: '#84cc16',    // Lime
  social: '#f97316',     // Orange
  email: '#6366f1',      // Indigo
  other: '#6b7280',      // Gray
  unknown: '#9ca3af',    // Light Gray
};

const PRIORITY_COLORS = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
  unknown: '#9ca3af',
};

export default function LeadSourceChart({ 
  leads = [], 
  showings = [],
  title = 'Lead Sources', 
  className = '' 
}) {
  const [view, setView] = useState('sources'); // sources, priority, conversion

  // Parse date from Firestore
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

  // Source breakdown
  const sourceData = useMemo(() => {
    const sources = {};
    
    leads.forEach((lead) => {
      let source = (lead.source || 'unknown').toLowerCase().trim();
      // Normalize source names
      if (source === 'call') source = 'phone';
      if (source === 'website') source = 'web';
      if (source === 'sign') source = 'signage';
      if (source === 'openhouse') source = 'open house';
      
      sources[source] = (sources[source] || 0) + 1;
    });

    return Object.entries(sources)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: SOURCE_COLORS[name] || SOURCE_COLORS.unknown,
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  // Priority breakdown
  const priorityData = useMemo(() => {
    const priorities = { hot: 0, warm: 0, cold: 0 };
    
    leads.forEach((lead) => {
      const priority = (lead.priority || 'cold').toLowerCase();
      if (priorities[priority] !== undefined) {
        priorities[priority]++;
      }
    });

    return [
      { name: 'Hot', value: priorities.hot, color: PRIORITY_COLORS.hot },
      { name: 'Warm', value: priorities.warm, color: PRIORITY_COLORS.warm },
      { name: 'Cold', value: priorities.cold, color: PRIORITY_COLORS.cold },
    ].filter(p => p.value > 0);
  }, [leads]);

  // Conversion metrics (lead → showing)
  const conversionData = useMemo(() => {
    // Count leads that have associated showings
    const leadsWithShowings = new Set();
    
    showings.forEach((showing) => {
      if (showing.leadId) {
        leadsWithShowings.add(showing.leadId);
      }
    });

    const convertedCount = leads.filter(lead => leadsWithShowings.has(lead.id)).length;
    const totalLeads = leads.length;
    const conversionRate = totalLeads > 0 
      ? Math.round((convertedCount / totalLeads) * 100) 
      : 0;

    return {
      rate: conversionRate,
      converted: convertedCount,
      total: totalLeads,
      pending: totalLeads - convertedCount,
    };
  }, [leads, showings]);

  const displayData = view === 'sources' ? sourceData : priorityData;
  const totalValue = displayData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={`min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} total leads
          </p>
        </div>
        
        {/* View Selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('sources')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              view === 'sources'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sources
          </button>
          <button
            onClick={() => setView('priority')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              view === 'priority'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Priority
          </button>
          <button
            onClick={() => setView('conversion')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              view === 'conversion'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Conversion
          </button>
        </div>
      </div>

      {/* Conversion View */}
      {view === 'conversion' && (
        <div className="text-center py-6">
          <div className="text-5xl font-bold text-green-600 mb-2">
            {conversionData.rate}%
          </div>
          <p className="text-gray-600">Lead → Showing Conversion</p>
          <p className="text-sm text-gray-500 mt-2">
            {conversionData.converted} of {conversionData.total} leads scheduled showings
          </p>
          
          {/* Simple progress bar */}
          <div className="mt-6 mx-auto max-w-xs">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Converted</span>
              <span>Pending</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${conversionData.rate}%` }}
              />
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-green-600 font-medium">{conversionData.converted}</span>
              <span className="text-gray-600">{conversionData.pending}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pie Chart for Sources/Priority */}
      {view !== 'conversion' && (
        <div className="h-56 min-w-0 min-h-[14rem]">
          {totalValue > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value, name) => {
                    const pct = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
                    return [`${value} (${pct}%)`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No lead data available
            </div>
          )}
        </div>
      )}

      {/* Legend / Stats */}
      {view === 'sources' && sourceData.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
          {sourceData.slice(0, 6).map((source) => (
            <div key={source.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: source.color }}
              />
              <span className="text-sm text-gray-600 truncate">{source.name}</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">{source.value}</span>
            </div>
          ))}
        </div>
      )}

      {view === 'priority' && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 text-center">
          <div>
            <p className="text-2xl font-semibold text-red-600">
              {priorityData.find(p => p.name === 'Hot')?.value || 0}
            </p>
            <p className="text-xs text-gray-500">🔥 Hot</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-amber-600">
              {priorityData.find(p => p.name === 'Warm')?.value || 0}
            </p>
            <p className="text-xs text-gray-500">☀️ Warm</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-blue-600">
              {priorityData.find(p => p.name === 'Cold')?.value || 0}
            </p>
            <p className="text-xs text-gray-500">❄️ Cold</p>
          </div>
        </div>
      )}
    </div>
  );
}
