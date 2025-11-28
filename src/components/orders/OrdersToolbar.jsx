export default function OrdersToolbar({ filters, onChange }) {
  function handleStatusChange(e) {
    onChange({ status: e.target.value });
  }

  function handleOrderTypeChange(e) {
    onChange({ orderType: e.target.value });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 justify-between rounded-lg border bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 font-medium">Status:</span>
        <select
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={filters.status}
          onChange={handleStatusChange}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 font-medium">Type:</span>
        <select
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={filters.orderType}
          onChange={handleOrderTypeChange}
        >
          <option value="all">All</option>
          <option value="pickup">Pickup</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>
    </div>
  );
}

