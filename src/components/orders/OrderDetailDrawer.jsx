import OrderStatusBadge from './OrderStatusBadge';

export default function OrderDetailDrawer({
  open,
  onClose,
  order,
  onStatusChange,
  updatingId,
}) {
  if (!open || !order) return null;

  const isUpdating = updatingId === order.id;
  const nextStatus = getNextStatus(order.status);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Order #{order.id.slice(-6)}
            </h2>
            <p className="text-xs text-gray-500">
              Created {formatDateTime(order.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          <section>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Status</h3>
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={order.status} />
              {nextStatus && (
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
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Customer</h3>
            <div className="text-sm text-gray-800">
              <div className="font-medium">{order.customerName || 'Unknown'}</div>
              <div className="text-xs text-gray-500 mt-1">{order.customerPhone}</div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Type</h3>
              <p className="text-gray-800 capitalize">{order.orderType}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Source: {sourceLabel(order.source)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Time</h3>
              <p className="text-gray-800">Created: {formatTime(order.createdAt)}</p>
              {order.scheduledFor && (
                <p className="text-xs text-gray-500 mt-0.5">
                  For: {formatTime(order.scheduledFor)}
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Items</h3>
            <div className="divide-y rounded-md border bg-gray-50">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between px-3 py-2">
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">{item.quantity}× </span>
                    <span>{item.name}</span>
                    {item.notes && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.notes}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-900 font-medium">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Subtotal</h3>
              <p className="text-gray-800">${order.subtotal?.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Total</h3>
              <p className="text-gray-800 font-semibold">${order.total?.toFixed(2)}</p>
            </div>
          </section>

          {(order.notes || (order.tags && order.tags.length > 0)) && (
            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Notes</h3>
              {order.notes && (
                <p className="text-sm text-gray-800">{order.notes}</p>
              )}
              {order.tags && order.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {order.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="border-t px-4 py-3 flex items-center justify-end">
          <button
            type="button"
            className="rounded-md bg-primary-600 text-white px-4 py-2 text-sm hover:bg-primary-700 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sourceLabel(source) {
  switch (source) {
    case 'phone_ai':
      return 'AI Phone';
    case 'online':
      return 'Online';
    case 'pos_import':
      return 'POS Import';
    default:
      return source || 'Unknown';
  }
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

