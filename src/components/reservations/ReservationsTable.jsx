import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationsTable({
  reservations,
  onReservationClick,
  onStatusChange,
  updatingId,
}) {
  if (!reservations || reservations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No reservations to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Guest</th>
            <th className="px-4 py-3">Date & Time</th>
            <th className="px-4 py-3">Party Size</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => {
            const isUpdating = updatingId === reservation.id;
            return (
              <tr
                key={reservation.id}
                className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => onReservationClick?.(reservation)}
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-gray-900">
                    {reservation.customerName || 'Unknown Guest'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPhone(reservation.customerPhone)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-sm text-gray-900 font-medium">
                    {reservation.date || 'Date TBD'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {reservation.time || 'Time TBD'}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">👥</span>
                    <span className="text-sm font-medium text-gray-900">
                      {reservation.partySize || '–'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    {reservation.source === 'phone_ai' && (
                      <>
                        <span>🤖</span>
                        <span>AI Phone</span>
                      </>
                    )}
                    {reservation.source === 'online' && (
                      <>
                        <span>🌐</span>
                        <span>Online</span>
                      </>
                    )}
                    {reservation.source === 'walk_in' && (
                      <>
                        <span>🚶</span>
                        <span>Walk-in</span>
                      </>
                    )}
                    {!reservation.source && <span className="text-gray-400">Unknown</span>}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {formatCreatedAt(reservation.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <ReservationStatusBadge status={reservation.status} />
                </td>
                <td
                  className="px-4 py-3 align-top text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <StatusButtonGroup
                    reservation={reservation}
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

function formatPhone(phone) {
  if (!phone) return '';
  // Format as (XXX) XXX-XXXX
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatCreatedAt(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusButtonGroup({ reservation, isUpdating, onStatusChange }) {
  const actions = getAvailableActions(reservation.status);
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 justify-end">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={isUpdating}
          onClick={() => onStatusChange?.(reservation, action.status)}
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            isUpdating
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : action.primary
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isUpdating ? '…' : action.label}
        </button>
      ))}
    </div>
  );
}

function getAvailableActions(status) {
  switch (status) {
    case 'pending':
      return [
        { status: 'confirmed', label: 'Confirm', primary: true },
        { status: 'cancelled', label: 'Cancel', primary: false },
      ];
    case 'confirmed':
      return [
        { status: 'completed', label: 'Seated', primary: true },
        { status: 'no_show', label: 'No Show', primary: false },
      ];
    default:
      return [];
  }
}

