export default function ReservationsToolbar({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3">
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Status:</label>
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="upcoming">Upcoming</option>
          <option value="all">All</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Date:</label>
        <select
          value={filters.dateRange}
          onChange={(e) => onChange({ dateRange: e.target.value })}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
}

