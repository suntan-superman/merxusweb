import { useEffect, useMemo, useState } from 'react';
import {
  cancelRestaurantBooking,
  confirmRestaurantBooking,
  declineRestaurantBooking,
  fetchRestaurantBookings,
  updateRestaurantBooking,
} from '../../api/restaurantBookings';
import LoadingSpinner from '../../components/LoadingSpinner';

const FILTERS = [
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'today', label: 'Today' },
  { key: 'large_private', label: 'Large / Private' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'closed', label: 'Cancelled / No-show' },
  { key: 'all', label: 'All' },
];

const STATUS_STYLES = {
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  requested: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  no_show: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
};

export default function RestaurantBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('pending_review');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingId, setUpdatingId] = useState('');
  const [savingNoteId, setSavingNoteId] = useState('');
  const [savingEditId, setSavingEditId] = useState('');

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBookings() {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchRestaurantBookings({ limit: 250 });
      setBookings(rows);
    } catch (err) {
      console.error(err);
      setError('Failed to load restaurant bookings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTransition(booking, action) {
    const bookingId = booking.bookingId || booking.id;
    if (!bookingId) return;

    setUpdatingId(bookingId);
    setError('');
    try {
      let updated;
      if (action === 'confirm') {
        updated = await confirmRestaurantBooking(bookingId);
      } else if (action === 'send_confirmation') {
        updated = await confirmRestaurantBooking(bookingId, { notifyCustomer: true });
      } else if (action === 'decline') {
        updated = await declineRestaurantBooking(bookingId, {
          reason: 'Declined from restaurant bookings dashboard.',
        });
      } else if (action === 'cancel') {
        updated = await cancelRestaurantBooking(bookingId, {
          reason: 'Cancelled from restaurant bookings dashboard.',
        });
      }

      if (updated) {
        setBookings((current) => current.map((item) => (
          (item.bookingId || item.id) === bookingId ? { ...item, ...updated } : item
        )));
        setSelectedBooking((current) => (
          current && (current.bookingId || current.id) === bookingId ? { ...current, ...updated } : current
        ));
      } else {
        await loadBookings();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update booking.');
    } finally {
      setUpdatingId('');
    }
  }

  async function handleSaveNote(booking, note) {
    const bookingId = booking.bookingId || booking.id;
    if (!bookingId) return;
    setSavingNoteId(bookingId);
    setError('');
    try {
      const updated = await updateRestaurantBooking(bookingId, {
        internalNotes: note,
      });
      if (updated) {
        setBookings((current) => current.map((item) => (
          (item.bookingId || item.id) === bookingId ? { ...item, ...updated } : item
        )));
        setSelectedBooking((current) => (
          current && (current.bookingId || current.id) === bookingId ? { ...current, ...updated } : current
        ));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save booking note.');
    } finally {
      setSavingNoteId('');
    }
  }

  async function handleSaveEdit(booking, patch) {
    const bookingId = booking.bookingId || booking.id;
    if (!bookingId) return;
    setSavingEditId(bookingId);
    setError('');
    try {
      const updated = await updateRestaurantBooking(bookingId, patch);
      if (updated) {
        setBookings((current) => current.map((item) => (
          (item.bookingId || item.id) === bookingId ? { ...item, ...updated } : item
        )));
        setSelectedBooking((current) => (
          current && (current.bookingId || current.id) === bookingId ? { ...current, ...updated } : current
        ));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save booking changes.');
    } finally {
      setSavingEditId('');
    }
  }

  const filteredBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const activeStatuses = new Set(['requested', 'pending_review', 'confirmed']);

    return bookings
      .filter((booking) => {
        if (filter === 'all') return true;
        if (filter === 'pending_review') return booking.status === 'pending_review' || booking.requiresApproval;
        if (filter === 'today') return booking.dateKey === today;
        if (filter === 'large_private') {
          return ['large_party', 'private_event', 'venue_rental'].includes(booking.bookingType)
            || Number(booking.partySize || 0) >= 8;
        }
        if (filter === 'upcoming') return activeStatuses.has(booking.status);
        if (filter === 'closed') return ['cancelled', 'declined', 'no_show'].includes(booking.status);
        return true;
      })
      .sort((left, right) => dateValue(left.startAt) - dateValue(right.startAt));
  }, [bookings, filter]);

  const counts = useMemo(() => ({
    pending: bookings.filter((booking) => booking.status === 'pending_review' || booking.requiresApproval).length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    conflicts: bookings.filter((booking) => booking.conflictState && booking.conflictState !== 'none').length,
  }), [bookings]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Restaurant Operations
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Bookings</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Review tenant-scoped AI, SMS, and staff-created booking requests.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBookings}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Pending review" value={counts.pending} tone="amber" />
        <Metric label="Confirmed" value={counts.confirmed} tone="emerald" />
        <Metric label="Conflicts" value={counts.conflicts} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              filter === item.key
                ? 'bg-emerald-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <LoadingSpinner text="Loading bookings..." />
      ) : (
        <BookingsTable
          bookings={filteredBookings}
          selectedId={selectedBooking?.bookingId || selectedBooking?.id}
          updatingId={updatingId}
          onSelect={setSelectedBooking}
          onTransition={handleTransition}
        />
      )}

      {selectedBooking ? (
        <BookingDetailDrawer
          booking={selectedBooking}
          updatingId={updatingId}
          savingNoteId={savingNoteId}
          savingEditId={savingEditId}
          onClose={() => setSelectedBooking(null)}
          onTransition={handleTransition}
          onSaveNote={handleSaveNote}
          onSaveEdit={handleSaveEdit}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone] || tones.emerald}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function BookingsTable({ bookings, selectedId, updatingId, onSelect, onTransition }) {
  if (!bookings.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No bookings match this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-700">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Guest</th>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Area</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Conflict</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {bookings.map((booking) => {
            const id = booking.bookingId || booking.id;
            const selected = selectedId === id;
            return (
              <tr
                key={id}
                className={`${selected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800/70'} cursor-pointer`}
                onClick={() => onSelect(booking)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-slate-100">{booking.customer?.name || 'SMS Guest'}</div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{formatPhone(booking.customer?.phone)}</div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                  <div>{formatDate(booking.startAt)}</div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{formatTime(booking.startAt)}</div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                  <div>{booking.assignedAreaName || booking.requestedAreaName || 'Unassigned'}</div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{booking.partySize || 0} guests</div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                  {booking.conflictState && booking.conflictState !== 'none' ? (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{formatLabel(booking.conflictState)}</span>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <ActionButtons booking={booking} updatingId={updatingId} onTransition={onTransition} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActionButtons({ booking, updatingId, onTransition }) {
  const id = booking.bookingId || booking.id;
  const busy = updatingId === id;
  const canConfirm = booking.status === 'pending_review' || booking.status === 'requested' || booking.requiresApproval;
  const canCancel = !['cancelled', 'declined', 'completed', 'no_show'].includes(booking.status);
  const canSendConfirmation = booking.status === 'confirmed' && booking.customer?.phone;

  return (
    <div className="inline-flex flex-wrap justify-end gap-2">
      {canConfirm ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTransition(booking, 'confirm')}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTransition(booking, 'decline')}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Decline
          </button>
        </>
      ) : null}
      {canCancel ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onTransition(booking, 'cancel')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      ) : null}
      {canSendConfirmation ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onTransition(booking, 'send_confirmation')}
          className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          Send SMS
        </button>
      ) : null}
    </div>
  );
}

function BookingDetailDrawer({ booking, updatingId, savingNoteId, savingEditId, onClose, onTransition, onSaveNote, onSaveEdit }) {
  const id = booking.bookingId || booking.id;
  const [noteDraft, setNoteDraft] = useState(booking.internalNotes || '');
  const [editDraft, setEditDraft] = useState(() => buildEditDraft(booking));
  const phone = booking.customer?.phone || '';

  useEffect(() => {
    setNoteDraft(booking.internalNotes || '');
    setEditDraft(buildEditDraft(booking));
  }, [booking]);

  function updateDraft(field, value) {
    setEditDraft((current) => ({ ...current, [field]: value }));
  }

  function saveEdit() {
    const patch = buildBookingPatch(editDraft);
    onSaveEdit(booking, patch);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Booking Details</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{booking.customer?.name || 'SMS Guest'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close booking details"
          >
            X
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <DetailGroup title="Status">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-slate-400">Current</span>
              <StatusBadge status={booking.status} />
            </div>
            <DetailRow label="Requires approval" value={booking.requiresApproval ? 'Yes' : 'No'} />
            <DetailRow label="Conflict" value={booking.conflictState && booking.conflictState !== 'none' ? formatLabel(booking.conflictState) : 'None'} />
            <DetailRow label="Conflict reason" value={booking.conflictReason} />
          </DetailGroup>

          <DetailGroup title="Guest">
            <DetailRow label="Name" value={booking.customer?.name} />
            <DetailRow label="Phone" value={formatPhone(booking.customer?.phone)} />
            <DetailRow label="Email" value={booking.customer?.email} />
            <DetailRow label="Party size" value={booking.partySize ? `${booking.partySize} guests` : null} />
          </DetailGroup>

          <DetailGroup title="Booking">
            <DetailRow label="Date" value={formatDate(booking.startAt)} />
            <DetailRow label="Time" value={formatTime(booking.startAt)} />
            <DetailRow label="Area" value={booking.assignedAreaName || booking.requestedAreaName} />
            <DetailRow label="Type" value={formatLabel(booking.bookingType)} />
            <DetailRow label="Source" value={formatLabel(booking.source)} />
          </DetailGroup>

          <DetailGroup title="Edit Booking">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <input
                  type="date"
                  value={editDraft.date}
                  onChange={(event) => updateDraft('date', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  value={editDraft.time}
                  onChange={(event) => updateDraft('time', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </Field>
              <Field label="Party Size">
                <input
                  type="number"
                  min="1"
                  value={editDraft.partySize}
                  onChange={(event) => updateDraft('partySize', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </Field>
              <Field label="Duration">
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={editDraft.durationMinutes}
                  onChange={(event) => updateDraft('durationMinutes', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </Field>
              <Field label="Assigned Area">
                <input
                  type="text"
                  value={editDraft.assignedAreaName}
                  onChange={(event) => updateDraft('assignedAreaName', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </Field>
              <Field label="Booking Type">
                <select
                  value={editDraft.bookingType}
                  onChange={(event) => updateDraft('bookingType', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="standard_dining">Standard Dining</option>
                  <option value="large_party">Large Party</option>
                  <option value="private_event">Private Event</option>
                  <option value="venue_rental">Venue Rental</option>
                </select>
              </Field>
            </div>
            <Field label="Customer Notes">
              <textarea
                value={editDraft.customerNotes}
                onChange={(event) => updateDraft('customerNotes', event.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <button
              type="button"
              disabled={savingEditId === id}
              onClick={saveEdit}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingEditId === id ? 'Saving...' : 'Save Changes'}
            </button>
          </DetailGroup>

          {booking.customerNotes || booking.aiSummary || booking.internalNotes ? (
            <DetailGroup title="Notes">
              {booking.customerNotes ? <NoteBlock label="Customer" value={booking.customerNotes} /> : null}
              {booking.aiSummary ? <NoteBlock label="AI summary" value={booking.aiSummary} /> : null}
            </DetailGroup>
          ) : null}

          <DetailGroup title="Internal Note">
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={4}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Add context for managers or staff."
            />
            <button
              type="button"
              disabled={savingNoteId === id}
              onClick={() => onSaveNote(booking, noteDraft)}
              className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              {savingNoteId === id ? 'Saving...' : 'Save Note'}
            </button>
          </DetailGroup>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {phone ? (
                <>
                  <a
                    href={`tel:${phone}`}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Call Customer
                  </a>
                  <a
                    href={`sms:${phone}`}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Text Customer
                  </a>
                </>
              ) : null}
            </div>
            <ActionButtons booking={booking} updatingId={updatingId} onTransition={onTransition} />
          </div>
        </div>
      </aside>
    </>
  );
}

function DetailGroup({ title, children }) {
  return (
    <section className="space-y-3">
      <h4 className="border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800 dark:border-slate-700 dark:text-slate-200">
        {title}
      </h4>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-gray-900 dark:text-slate-100">{value || '-'}</span>
    </div>
  );
}

function NoteBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-gray-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.requested}`}>
      {formatLabel(status || 'requested')}
    </span>
  );
}

function dateValue(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const seconds = value?._seconds ?? value?.seconds ?? null;
  if (seconds) return new Date(seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildEditDraft(booking) {
  const start = toDate(booking.startAt);
  return {
    date: start ? start.toISOString().slice(0, 10) : '',
    time: start ? start.toTimeString().slice(0, 5) : '',
    partySize: booking.partySize || 1,
    durationMinutes: booking.durationMinutes || minutesBetween(booking.startAt, booking.endAt) || 90,
    assignedAreaName: booking.assignedAreaName || booking.requestedAreaName || '',
    bookingType: booking.bookingType || 'standard_dining',
    customerNotes: booking.customerNotes || '',
  };
}

function buildBookingPatch(draft) {
  const patch = {
    partySize: Number(draft.partySize || 1),
    durationMinutes: Number(draft.durationMinutes || 90),
    assignedAreaName: String(draft.assignedAreaName || '').trim(),
    bookingType: draft.bookingType || 'standard_dining',
    customerNotes: draft.customerNotes || '',
  };

  if (draft.date && draft.time) {
    const startAt = new Date(`${draft.date}T${draft.time}:00`);
    if (!Number.isNaN(startAt.getTime())) {
      patch.startAt = startAt.toISOString();
      const endAt = new Date(startAt.getTime() + patch.durationMinutes * 60000);
      patch.endAt = endAt.toISOString();
    }
  }

  return patch;
}

function minutesBetween(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return 'Date TBD';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(value) {
  const date = toDate(value);
  if (!date) return 'Time TBD';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPhone(phone) {
  if (!phone) return '-';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
