// Showing Conversion Chart Component
// Shows lead-to-showing and showing-to-contract conversion rates for real estate

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const COLORS = {
  leads: '#3b82f6',      // Blue
  showings: '#10b981',   // Green
  contracts: '#8b5cf6',  // Purple
  closed: '#f59e0b',     // Amber
};

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  confirmed: '#10b981',
  completed: '#8b5cf6',
  cancelled: '#ef4444',
  'no-show': '#f97316',
};

export default function ShowingConversionChart({ 
  leads = [], 
  showings = [],
  title = 'Conversion Funnel', 
  className = '' 
}) {
  const [view, setView] = useState('funnel'); // funnel, status, trend

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

  // Calculate conversion funnel data
  const funnelData = useMemo(() => {
    const totalLeads = leads.length;
    const leadsWithShowings = leads.filter(lead => {
      // Check if this lead has any associated showings
      return showings.some(s => s.leadId === lead.id || s.lead_id === lead.id);
    }).length;
    
    const completedShowings = showings.filter(s => 
      s.status === 'completed' || s.status === 'shown'
    ).length;
    
    // Leads that converted to contracts (either in contract status or closed)
    const contractLeads = leads.filter(lead => 
      lead.status === 'contract' || 
      lead.status === 'closed' || 
      lead.status === 'under_contract'
    ).length;
    
    const closedLeads = leads.filter(lead => 
      lead.status === 'closed'
    ).length;

    return [
      { name: 'Total Leads', value: totalLeads, color: COLORS.leads },
      { name: 'Had Showings', value: leadsWithShowings, color: COLORS.showings },
      { name: 'Under Contract', value: contractLeads, color: COLORS.contracts },
      { name: 'Closed', value: closedLeads, color: COLORS.closed },
    ];
  }, [leads, showings]);

  // Calculate showing status breakdown
  const showingStatusData = useMemo(() => {
    const statuses = {};
    
    showings.forEach((showing) => {
      const status = (showing.status || 'scheduled').toLowerCase();
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return Object.entries(statuses)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' '),
        value: count,
        color: STATUS_COLORS[status] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [showings]);

  // Calculate conversion rates
  const conversionRates = useMemo(() => {
    const totalLeads = leads.length;
    const totalShowings = showings.length;
    const completedShowings = showings.filter(s => 
      s.status === 'completed' || s.status === 'shown'
    ).length;
    const contractLeads = leads.filter(lead => 
      lead.status === 'contract' || 
      lead.status === 'closed' || 
      lead.status === 'under_contract'
    ).length;

    return {
      leadToShowing: totalLeads > 0 ? ((totalShowings / totalLeads) * 100).toFixed(1) : 0,
      showingCompletion: totalShowings > 0 ? ((completedShowings / totalShowings) * 100).toFixed(1) : 0,
      showingToContract: completedShowings > 0 ? ((contractLeads / completedShowings) * 100).toFixed(1) : 0,
      overallConversion: totalLeads > 0 ? ((contractLeads / totalLeads) * 100).toFixed(1) : 0,
    };
  }, [leads, showings]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-semibold">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (leads.length === 0 && showings.length === 0) {
    return (
      <div className={`card ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <p>No leads or showings yet</p>
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
            {leads.length} leads • {showings.length} showings
          </p>
        </div>
        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => setView('funnel')}
            className={`px-3 py-1 text-xs ${view === 'funnel' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Funnel
          </button>
          <button
            onClick={() => setView('status')}
            className={`px-3 py-1 text-xs ${view === 'status' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Status
          </button>
        </div>
      </div>

      {/* Conversion Rate Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Lead → Showing</p>
          <p className="text-lg font-bold text-blue-900">{conversionRates.leadToShowing}%</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Show Rate</p>
          <p className="text-lg font-bold text-green-900">{conversionRates.showingCompletion}%</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Show → Contract</p>
          <p className="text-lg font-bold text-purple-900">{conversionRates.showingToContract}%</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-600 font-medium">Overall</p>
          <p className="text-lg font-bold text-amber-900">{conversionRates.overallConversion}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'funnel' ? (
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#374151', fontSize: 12 }}
                width={75}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={showingStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {showingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend for Pie Chart */}
      {view === 'status' && showingStatusData.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {showingStatusData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
