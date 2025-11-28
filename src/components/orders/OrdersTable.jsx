import OrderStatusBadge from './OrderStatusBadge';

export default function OrdersTable({
  orders,
  onOrderClick,
  onStatusChange,
  updatingId,
}) {
  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No orders to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isUpdating = updatingId === order.id;
            return (
              <tr
                key={order.id}
                className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => onOrderClick?.(order)}
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-gray-900">#{order.id.slice(-6)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {order.items?.slice(0, 2).map((item, idx) => (
                      <span key={idx}>
                        {item.quantity}× {item.name}
                        {idx < Math.min(order.items.length, 2) - 1 ? ', ' : ''}
                      </span>
                    ))}
                    {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-sm text-gray-900">{order.customerName || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{order.customerPhone}</div>
                </td>
                <td className="px-4 py-3 align-top text-xs text-gray-700">
                  <div className="capitalize">{order.orderType}</div>
                  <div className="text-[11px] text-gray-500">
                    {order.source === 'phone_ai' && 'AI Phone'}
                    {order.source === 'online' && 'Online'}
                    {order.source === 'pos_import' && 'POS Import'}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-xs text-gray-700">
                  {formatTime(order.createdAt)}
                  {order.scheduledFor && (
                    <div className="text-[11px] text-gray-500">
                      For {formatTime(order.scheduledFor)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-900 font-medium">
                  ${order.total?.toFixed(2)}
                </td>
                <td className="px-4 py-3 align-top">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td
                  className="px-4 py-3 align-top text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <StatusButtonGroup
                    order={order}
                    isUpdating={isUpdating}
                    onStatusChange={onStatusChange}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusButtonGroup({ order, isUpdating, onStatusChange }) {
  const nextStatus = getNextStatus(order.status);
  if (!nextStatus) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={isUpdating}
      onClick={() => onStatusChange?.(order, nextStatus)}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        isUpdating
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-primary-600 text-white hover:bg-primary-700'
      }`}
    >
      {isUpdating ? 'Updating…' : `Mark ${labelForStatus(nextStatus)}`}
    </button>
  );
}

function getNextStatus(status) {
  switch (status) {
    case 'new':
      return 'accepted';
    case 'accepted':
      return 'in_progress';
    case 'in_progress':
      return 'ready';
    case 'ready':
      return 'completed';
    default:
      return null;
  }
}

function labelForStatus(status) {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'in_progress':
      return 'In Progress';
    case 'ready':
      return 'Ready';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

