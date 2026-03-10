import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STATUS_COLORS = ['#1d4ed8', '#16a34a', '#dc2626', '#6b7280', '#d97706', '#7c3aed'];
const REASON_COLORS = ['#059669', '#dc2626', '#2563eb', '#9333ea', '#ea580c', '#4b5563'];
const TREND_COLORS = {
  outbound: '#1d4ed8',
  delivered: '#16a34a',
  inbound: '#7c3aed',
  optOuts: '#dc2626',
};
const RANGE_OPTIONS = [7, 30, 90];

function getAlertTone(severity) {
  if (severity === 'critical') {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (severity === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export default function SmsAnalyticsPanel({
  analytics,
  days = 30,
  loading = false,
  onDaysChange,
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Loading SMS analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const statusData = analytics.deliveryStatuses || [];
  const reasonData = analytics.suppressionReasons || [];
  const automationData = analytics.automationTypes || [];
  const trendData = analytics.trend || [];
  const alerts = analytics.alerts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">SMS Performance</h4>
          <p className="text-xs text-gray-500">
            Delivery, automation mix, and post-call suppression telemetry for the last {days} days.
          </p>
        </div>
        {onDaysChange ? (
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onDaysChange(option)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  days === option
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Messages" value={analytics.totals?.messages || 0} />
        <MetricCard label="Outbound" value={analytics.totals?.outbound || 0} />
        <MetricCard label="Inbound" value={analytics.totals?.inbound || 0} />
        <MetricCard label="Delivery Rate" value={`${analytics.deliveryRate || 0}%`} />
        <MetricCard
          label="Post-Call Sent"
          value={analytics.totals?.postCallSent || 0}
          hint={`${analytics.totals?.postCallEvaluated || 0} evaluated`}
        />
        <MetricCard label="Opt-Outs" value={analytics.totals?.optOuts || 0} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-semibold text-gray-900">Health Alerts</h5>
            <p className="text-xs text-gray-500">Flags delivery degradation, opt-out spikes, and follow-up suppression.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {alerts.length === 0 ? 'Healthy window' : `${alerts.length} active`}
          </span>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500">No SMS health alerts are active for this reporting window.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={`rounded-lg border p-3 ${getAlertTone(alert.severity)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{alert.severity}</p>
                <p className="mt-1 text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">Daily Trend</h5>
        {trendData.length === 0 ? (
          <p className="text-sm text-gray-500">No time-series SMS data yet.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="outbound" stroke={TREND_COLORS.outbound} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="delivered" stroke={TREND_COLORS.delivered} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="inbound" stroke={TREND_COLORS.inbound} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="optOuts" stroke={TREND_COLORS.optOuts} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Outbound Delivery Status</h5>
          {statusData.length === 0 ? (
            <p className="text-sm text-gray-500">No outbound SMS data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="key" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {statusData.map((entry, index) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Automation Mix</h5>
          {automationData.length === 0 ? (
            <p className="text-sm text-gray-500">No automation data yet.</p>
          ) : (
            <div className="space-y-3">
              {automationData.map((item, index) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.key.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.max(8, (item.value / Math.max(1, analytics.totals?.outbound || 1)) * 100)}%`,
                        backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">Top Suppression Reasons</h5>
        {reasonData.length === 0 ? (
          <p className="text-sm text-gray-500">No suppressed post-call sends recorded in this window.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData} margin={{ top: 5, right: 20, left: 0, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value, name) => [value, name]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {reasonData.map((entry, index) => (
                    <Cell key={entry.key} fill={REASON_COLORS[index % REASON_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
