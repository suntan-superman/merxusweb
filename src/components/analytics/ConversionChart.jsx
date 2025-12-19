// Conversion Metrics Chart Component
// Shows call outcomes and conversion rates (e.g., calls → orders, calls → leads)

import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

const STATUS_COLORS = {
  completed: COLORS.success,
  answered: COLORS.success,
  voicemail: COLORS.info,
  missed: COLORS.danger,
  'no-answer': COLORS.danger,
  no_answer: COLORS.danger,
  busy: COLORS.warning,
  failed: COLORS.danger,
  transferred: COLORS.purple,
  in_progress: COLORS.neutral,
  unknown: COLORS.neutral,
};

export default function ConversionChart({ 
  calls = [], 
  orders = [], // For restaurant context
  leads = [],  // For real estate context
  title = 'Call Outcomes', 
  className = '',
  context = 'voice' // 'voice', 'restaurant', 'estate'
}) {
  const [view, setView] = useState('outcomes'); // outcomes, conversions

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

  // Call outcomes breakdown
  const outcomesData = useMemo(() => {
    const outcomes = {};
    
    calls.forEach((call) => {
      let status = (call.status || 'unknown').toLowerCase().replace(/-/g, '_');
      
      // Normalize statuses
      if (status === 'no_answer' || status === 'noanswer') status = 'missed';
      if (status === 'in_progress' || status === 'ringing') status = 'in_progress';
      if (!STATUS_COLORS[status]) status = 'unknown';
      
      outcomes[status] = (outcomes[status] || 0) + 1;
    });

    return Object.entries(outcomes)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        value,
        color: STATUS_COLORS[name] || COLORS.neutral,
      }))
      .sort((a, b) => b.value - a.value);
  }, [calls]);

  // Conversion metrics based on context
  const conversionData = useMemo(() => {
    const totalCalls = calls.length;
    
    if (context === 'restaurant') {
      // Calls that resulted in orders
      const callsWithOrders = orders.filter(order => {
        // Check if order came from a call (has callSessionId or source === 'phone')
        return order.callSessionId || order.source === 'phone' || order.source === 'call';
      }).length;

      const conversionRate = totalCalls > 0 
        ? Math.round((callsWithOrders / totalCalls) * 100) 
        : 0;

      return {
        primary: {
          label: 'Order Conversion',
          value: conversionRate,
          description: `${callsWithOrders} orders from ${totalCalls} calls`,
        },
        breakdown: [
          { name: 'Converted to Order', value: callsWithOrders, color: COLORS.success },
          { name: 'No Order', value: totalCalls - callsWithOrders, color: COLORS.neutral },
        ],
      };
    } else if (context === 'estate') {
      // Calls that resulted in leads
      const callsWithLeads = leads.filter(lead => {
        return lead.source === 'phone' || lead.source === 'call' || lead.callSessionId;
      }).length;

      const conversionRate = totalCalls > 0 
        ? Math.round((callsWithLeads / totalCalls) * 100) 
        : 0;

      return {
        primary: {
          label: 'Lead Conversion',
          value: conversionRate,
          description: `${callsWithLeads} leads from ${totalCalls} calls`,
        },
        breakdown: [
          { name: 'Converted to Lead', value: callsWithLeads, color: COLORS.success },
          { name: 'No Lead', value: totalCalls - callsWithLeads, color: COLORS.neutral },
        ],
      };
    } else {
      // Voice context - show answer rate
      const answered = calls.filter(c => {
        const status = (c.status || '').toLowerCase();
        return status === 'completed' || status === 'answered' || c.durationSec > 0;
      }).length;

      const answerRate = totalCalls > 0 
        ? Math.round((answered / totalCalls) * 100) 
        : 0;

      return {
        primary: {
          label: 'Answer Rate',
          value: answerRate,
          description: `${answered} answered of ${totalCalls} calls`,
        },
        breakdown: [
          { name: 'Answered', value: answered, color: COLORS.success },
          { name: 'Unanswered', value: totalCalls - answered, color: COLORS.neutral },
        ],
      };
    }
  }, [calls, orders, leads, context]);

  const displayData = view === 'outcomes' ? outcomesData : conversionData.breakdown;
  const totalValue = displayData.reduce((sum, d) => sum + d.value, 0);

  // Custom legend renderer
  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">
              {entry.value} ({displayData.find(d => d.name === entry.value)?.value || 0})
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {view === 'conversions' && (
            <p className="text-sm text-gray-500 mt-1">{conversionData.primary.description}</p>
          )}
        </div>
        
        {/* View Selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('outcomes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              view === 'outcomes'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Outcomes
          </button>
          <button
            onClick={() => setView('conversions')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              view === 'conversions'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Conversion
          </button>
        </div>
      </div>

      {/* Conversion Rate Display (when in conversion view) */}
      {view === 'conversions' && (
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-blue-600">
            {conversionData.primary.value}%
          </div>
          <p className="text-sm text-gray-500 mt-1">{conversionData.primary.label}</p>
        </div>
      )}

      {/* Pie Chart */}
      <div className="h-56">
        {totalValue > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={view === 'conversions' ? 50 : 40}
                outerRadius={view === 'conversions' ? 80 : 70}
                paddingAngle={2}
                dataKey="value"
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
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {view === 'outcomes' && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-600">
              {outcomesData.find(d => d.name.toLowerCase().includes('complet'))?.value || 
               outcomesData.find(d => d.name.toLowerCase().includes('answer'))?.value || 0}
            </p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-red-600">
              {outcomesData.find(d => d.name.toLowerCase().includes('miss'))?.value || 0}
            </p>
            <p className="text-xs text-gray-500">Missed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-blue-600">
              {outcomesData.find(d => d.name.toLowerCase().includes('voicemail'))?.value || 0}
            </p>
            <p className="text-xs text-gray-500">Voicemail</p>
          </div>
        </div>
      )}
    </div>
  );
}
