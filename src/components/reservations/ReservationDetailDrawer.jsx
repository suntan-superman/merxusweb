import { Fragment } from 'react';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationDetailDrawer({
  open,
  onClose,
  reservation,
  onStatusChange,
  updatingId,
}) {
  if (!open || !reservation) return null;

  const isUpdating = updatingId === reservation.id;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Reservation Details
            </h2>
            <p className="text-sm text-gray-500">
              {reservation.customerName || 'Unknown Guest'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <ReservationStatusBadge status={reservation.status} />
          </div>

          {/* Guest Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
              Guest Information
            </h3>
            <DetailRow label="Name" value={reservation.customerName} />
            <DetailRow label="Phone" value={formatPhone(reservation.customerPhone)} />
            <DetailRow label="Party Size" value={reservation.partySize ? `${reservation.partySize} guests` : null} />
          </div>

          {/* Reservation Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
              Reservation Details
            </h3>
            <DetailRow label="Date" value={reservation.date} />
            <DetailRow label="Time" value={reservation.time} />
            <DetailRow label="Special Requests" value={reservation.specialRequests} />
          </div>

          {/* Source & Tracking */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
              Source
            </h3>
            <DetailRow 
              label="Booked Via" 
              value={
                reservation.source === 'phone_ai' ? '🤖 AI Phone Assistant' :
                reservation.source === 'online' ? '🌐 Online Booking' :
                reservation.source === 'walk_in' ? '🚶 Walk-in' :
                'Unknown'
              } 
            />
            {reservation.callSid && (
              <DetailRow label="Call ID" value={reservation.callSid.slice(-8)} />
            )}
            <DetailRow 
              label="Created" 
              value={formatTimestamp(reservation.createdAt)} 
            />
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {reservation.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex gap-2">
            {reservation.status === 'pending' && (
              <>
                <button
                  onClick={() => onStatusChange(reservation, 'confirmed')}
                  disabled={isUpdating}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? 'Updating…' : 'Confirm Reservation'}
                </button>
                <button
                  onClick={() => onStatusChange(reservation, 'cancelled')}
                  disabled={isUpdating}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
            {reservation.status === 'confirmed' && (
              <>
                <button
                  onClick={() => onStatusChange(reservation, 'completed')}
                  disabled={isUpdating}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? 'Updating…' : 'Mark as Seated'}
                </button>
                <button
                  onClick={() => onStatusChange(reservation, 'no_show')}
                  disabled={isUpdating}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  No Show
                </button>
              </>
            )}
            {['completed', 'cancelled', 'no_show'].includes(reservation.status) && (
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value || '–'}</span>
    </div>
  );
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

