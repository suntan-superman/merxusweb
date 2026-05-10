import { useEffect, useMemo, useState } from 'react';
import '../../utils/syncfusionScheduleRuntime';
import { ScheduleComponent, ViewsDirective, ViewDirective, Day, Week, Month, Agenda, Inject } from '@syncfusion/ej2-react-schedule';
import {
  cancelRestaurantBooking,
  confirmRestaurantBooking,
  createRestaurantBooking,
  declineRestaurantBooking,
  fetchRestaurantBookingAreas,
  fetchRestaurantBookings,
  updateRestaurantBooking,
} from '../../api/restaurantBookings';
import { sendManualSms } from '../../api/sms';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { formatPhoneDisplay, formatPhoneInput, isValidPhone, toE164 } from '../../utils/phoneFormatter';

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
  const [areas, setAreas] = useState([]);
  const [filter, setFilter] = useState('pending_review');
  const [viewMode, setViewMode] = useState('table');
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingId, setUpdatingId] = useState('');
  const [savingNoteId, setSavingNoteId] = useState('');
  const [savingEditId, setSavingEditId] = useState('');
  const [sendingSmsId, setSendingSmsId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBookings() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const rows = await fetchRestaurantBookings({ limit: 250 });
      setBookings(rows);
      try {
        setAreas(await fetchRestaurantBookingAreas());
      } catch (areaErr) {
        console.warn('Failed to load restaurant booking areas.', areaErr);
        setAreas([]);
      }
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
    setNotice('');
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
        if (action === 'send_confirmation') {
          setNotice('Customer SMS queued.');
        }
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

  function requestTransition(booking, action) {
    if (action === 'cancel' || action === 'decline') {
      setConfirmAction({ booking, action });
      return;
    }
    handleTransition(booking, action);
  }

  async function confirmPendingAction() {
    if (!confirmAction) return;
    const pending = confirmAction;
    setConfirmAction(null);
    await handleTransition(pending.booking, pending.action);
  }

  async function handleSendCustomerSms(booking) {
    const bookingId = booking.bookingId || booking.id;
    const to = toE164(booking.customer?.phone || '');
    if (!bookingId || !to) {
      setError('A valid customer phone number is required before sending SMS.');
      return;
    }

    setSendingSmsId(bookingId);
    setError('');
    setNotice('');
    try {
      await sendManualSms({
        to,
        body: buildBookingSmsBody(booking),
        trigger: 'restaurant_booking_manual',
      });
      setNotice('Customer SMS sent.');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to send customer SMS.');
    } finally {
      setSendingSmsId('');
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

  async function handleCreateBooking(input) {
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const created = await createRestaurantBooking(input);
      if (created) {
        setBookings((current) => [...current, created]);
        setSelectedBooking(created);
        setCreateOpen(false);
        setFilter('upcoming');
        setNotice(input.sendSms ? 'Booking created. Customer SMS queued when tenant SMS confirmations are enabled.' : 'Booking created.');
      } else {
        await loadBookings();
        setCreateOpen(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create booking.');
    } finally {
      setCreating(false);
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            New Booking
          </button>
          <button
            type="button"
            onClick={loadBookings}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Pending review" value={counts.pending} tone="amber" />
        <Metric label="Confirmed" value={counts.confirmed} tone="emerald" />
        <Metric label="Conflicts" value={counts.conflicts} tone="red" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
        <div className="inline-flex w-fit rounded-md border border-gray-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {[
            { key: 'table', label: 'Table' },
            { key: 'calendar', label: 'Calendar' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setViewMode(item.key)}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                viewMode === item.key
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <LoadingSpinner text="Loading bookings..." />
      ) : viewMode === 'calendar' ? (
        <BookingsCalendar
          bookings={filteredBookings}
          expanded={calendarExpanded}
          onExpand={() => setCalendarExpanded(true)}
          onCollapse={() => setCalendarExpanded(false)}
          onSelect={setSelectedBooking}
        />
      ) : (
        <BookingsTable
          bookings={filteredBookings}
          selectedId={selectedBooking?.bookingId || selectedBooking?.id}
          updatingId={updatingId}
          onSelect={setSelectedBooking}
          onTransition={requestTransition}
        />
      )}

      {createOpen ? (
        <CreateBookingModal
          creating={creating}
          areas={areas}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreateBooking}
        />
      ) : null}

      {selectedBooking ? (
        <BookingDetailDrawer
          booking={selectedBooking}
          updatingId={updatingId}
          savingNoteId={savingNoteId}
          savingEditId={savingEditId}
          sendingSmsId={sendingSmsId}
          areas={areas}
          onClose={() => setSelectedBooking(null)}
          onTransition={requestTransition}
          onSendCustomerSms={handleSendCustomerSms}
          onSaveNote={handleSaveNote}
          onSaveEdit={handleSaveEdit}
        />
      ) : null}
      <ConfirmationModal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmPendingAction}
        title={confirmAction?.action === 'decline' ? 'Decline Booking' : 'Cancel Booking'}
        message={buildTransitionConfirmationMessage(confirmAction)}
        confirmText={confirmAction?.action === 'decline' ? 'Decline booking' : 'Cancel booking'}
        cancelText="Keep booking"
        variant="warning"
        isLoading={Boolean(confirmAction && updatingId === (confirmAction.booking?.bookingId || confirmAction.booking?.id))}
      />
    </div>
  );
}

function BookingsCalendar({ bookings, expanded, onExpand, onCollapse, onSelect }) {
  const events = useMemo(() => bookings.map((booking) => {
    const start = toDate(booking.startAt);
    const end = toDate(booking.endAt) || (start ? new Date(start.getTime() + Number(booking.durationMinutes || 90) * 60000) : null);
    const status = formatLabel(booking.status || 'requested');
    return {
      Id: booking.bookingId || booking.id,
      Subject: `${booking.customer?.name || 'Guest'} (${booking.partySize || 0})`,
      StartTime: start,
      EndTime: end,
      Description: `${status} | ${booking.assignedAreaName || booking.requestedAreaName || 'Unassigned'}`,
      Booking: booking,
      CategoryColor: booking.status === 'confirmed' ? '#059669' : booking.status === 'pending_review' ? '#d97706' : '#2563eb',
    };
  }).filter((event) => event.StartTime && event.EndTime), [bookings]);

  return (
    <div className={expanded
      ? 'fixed inset-0 z-40 flex flex-col bg-white p-4 dark:bg-slate-950'
      : 'overflow-hidden rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900'}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Booking Calendar</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{bookings.length} bookings in the selected view</p>
        </div>
        <button
          type="button"
          onClick={expanded ? onCollapse : onExpand}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {expanded ? 'Close Full Screen' : 'Open Full Screen'}
        </button>
      </div>
      <ScheduleComponent
        width="100%"
        height={expanded ? 'calc(100vh - 96px)' : 'min(720px, calc(100vh - 260px))'}
        selectedDate={new Date()}
        currentView="Week"
        readonly
        eventSettings={{
          dataSource: events,
          fields: {
            id: 'Id',
            subject: 'Subject',
            startTime: 'StartTime',
            endTime: 'EndTime',
            description: 'Description',
          },
        }}
        eventRendered={(args) => {
          if (args.data?.CategoryColor) {
            args.element.style.backgroundColor = args.data.CategoryColor;
            args.element.style.borderColor = args.data.CategoryColor;
          }
        }}
        eventClick={(args) => {
          args.cancel = true;
          const eventData = args.event || args.data;
          if (eventData?.Booking) onSelect(eventData.Booking);
        }}
        popupOpen={(args) => {
          if (args.type === 'Editor') args.cancel = true;
        }}
      >
        <ViewsDirective>
          <ViewDirective option="Day" />
          <ViewDirective option="Week" />
          <ViewDirective option="Month" />
          <ViewDirective option="Agenda" />
        </ViewsDirective>
        <Inject services={[Day, Week, Month, Agenda]} />
      </ScheduleComponent>
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
          Cancel Booking
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

function CreateBookingModal({ creating, areas = [], onClose, onCreate }) {
  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    date: defaultDate,
    time: '18:00',
    partySize: 2,
    durationMinutes: 90,
    requestedAreaName: '',
    bookingType: 'standard_dining',
    customerNotes: '',
    internalNotes: '',
    status: 'confirmed',
    notifyCustomer: true,
  });
  const normalizedEmail = draft.customerEmail.trim();
  const emailValid = !normalizedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const canSubmit = Boolean(
    draft.customerName.trim()
      && isValidPhone(draft.customerPhone)
      && draft.date
      && draft.time
      && Number(draft.partySize) >= 1
      && Number(draft.durationMinutes) >= 15
      && emailValid
  );

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const startAt = new Date(`${draft.date}T${draft.time}:00`);
    const durationMinutes = Number(draft.durationMinutes || 90);
    const payload = {
      source: 'staff_dashboard',
      status: draft.status,
      customerName: draft.customerName.trim() || 'Guest',
      customerPhone: toE164(draft.customerPhone),
      customerEmail: draft.customerEmail.trim(),
      partySize: Number(draft.partySize || 1),
      durationMinutes,
      startAt: startAt.toISOString(),
      endAt: new Date(startAt.getTime() + durationMinutes * 60000).toISOString(),
      requestedAreaName: draft.requestedAreaName.trim(),
      assignedAreaName: draft.requestedAreaName.trim(),
      bookingType: draft.bookingType,
      customerNotes: draft.customerNotes.trim(),
      internalNotes: draft.internalNotes.trim(),
      sendSms: draft.notifyCustomer,
    };
    onCreate(payload);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" />
      <div className="fixed inset-x-4 top-8 z-50 mx-auto max-h-[calc(100vh-4rem)] max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">New Booking</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Add a staff-created reservation to the tenant booking workflow.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Close new booking form"
            >
              X
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Guest Name">
              <input
                required
                type="text"
                value={draft.customerName}
                onChange={(event) => updateDraft('customerName', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <Field label="Phone">
              <input
                required
                type="tel"
                value={draft.customerPhone}
                onChange={(event) => updateDraft('customerPhone', formatPhoneInput(event.target.value))}
                placeholder="(661) 555-1234"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={draft.customerEmail}
                onChange={(event) => updateDraft('customerEmail', event.target.value)}
                className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-1 dark:bg-slate-950 dark:text-slate-100 ${
                  emailValid
                    ? 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700'
                    : 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800'
                }`}
              />
              {!emailValid ? <p className="text-xs text-red-600 dark:text-red-300">Enter a valid email address.</p> : null}
            </Field>
            <Field label="Area">
              <select
                value={draft.requestedAreaName}
                onChange={(event) => updateDraft('requestedAreaName', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Unassigned</option>
                {areas.map((area) => (
                  <option key={area.areaId || area.id || area.name} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                required
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft('date', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <Field label="Time">
              <input
                required
                type="time"
                value={draft.time}
                onChange={(event) => updateDraft('time', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <Field label="Party Size">
              <input
                required
                type="number"
                min="1"
                value={draft.partySize}
                onChange={(event) => updateDraft('partySize', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <Field label="Duration">
              <input
                type="number"
                min="15"
                step="15"
                value={draft.durationMinutes}
                onChange={(event) => updateDraft('durationMinutes', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </Field>
            <Field label="Booking Type">
              <select
                value={draft.bookingType}
                onChange={(event) => updateDraft('bookingType', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="standard_dining">Standard Dining</option>
                <option value="large_party">Large Party</option>
                <option value="private_event">Private Event</option>
                <option value="venue_rental">Venue Rental</option>
              </select>
            </Field>
            <Field label="Initial Status">
              <select
                value={draft.status}
                onChange={(event) => updateDraft('status', event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending_review">Pending Review</option>
                <option value="requested">Requested</option>
              </select>
            </Field>
          </div>

          <Field label="Customer Notes">
            <textarea
              rows={3}
              value={draft.customerNotes}
              onChange={(event) => updateDraft('customerNotes', event.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>

          <Field label="Internal Notes">
            <textarea
              rows={3}
              value={draft.internalNotes}
              onChange={(event) => updateDraft('internalNotes', event.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>

          <label className="flex items-start gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <input
              type="checkbox"
              checked={draft.notifyCustomer}
              onChange={(event) => updateDraft('notifyCustomer', event.target.checked)}
              className="mt-1"
            />
            <span>Send customer SMS when tenant SMS confirmations are enabled.</span>
          </label>

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={creating || !canSubmit}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function BookingDetailDrawer({
  booking,
  updatingId,
  savingNoteId,
  savingEditId,
  sendingSmsId,
  areas = [],
  onClose,
  onTransition,
  onSendCustomerSms,
  onSaveNote,
  onSaveEdit,
}) {
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
                <select
                  value={editDraft.assignedAreaName}
                  onChange={(event) => updateDraft('assignedAreaName', event.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Unassigned</option>
                  {areas.map((area) => (
                    <option key={area.areaId || area.id || area.name} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                  {editDraft.assignedAreaName && !areas.some((area) => area.name === editDraft.assignedAreaName) ? (
                    <option value={editDraft.assignedAreaName}>{editDraft.assignedAreaName}</option>
                  ) : null}
                </select>
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
                  <button
                    type="button"
                    disabled={sendingSmsId === id}
                    onClick={() => onSendCustomerSms(booking)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {sendingSmsId === id ? 'Sending...' : 'Text Customer'}
                  </button>
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
  return formatPhoneDisplay(phone) || '-';
}

function buildTransitionConfirmationMessage(confirmAction) {
  if (!confirmAction) return '';
  const { booking, action } = confirmAction;
  const guest = booking?.customer?.name || 'this guest';
  const date = formatDate(booking?.startAt);
  const time = formatTime(booking?.startAt);

  if (action === 'decline') {
    return `Decline the booking request for ${guest} on ${date} at ${time}?\n\nThis changes the booking status and may notify the customer if notifications are enabled.`;
  }

  return `Cancel the booking for ${guest} on ${date} at ${time}?\n\nThis keeps the booking history for audit purposes but removes it from active upcoming reservations.`;
}

function buildBookingSmsBody(booking) {
  const guestName = booking.customer?.name || 'there';
  const date = formatDate(booking.startAt);
  const time = formatTime(booking.startAt);
  const area = booking.assignedAreaName || booking.requestedAreaName;
  const partySize = booking.partySize ? `${booking.partySize} guest${Number(booking.partySize) === 1 ? '' : 's'}` : 'your party';
  const areaText = area ? ` in ${area}` : '';
  return `Hi ${guestName}, your reservation for ${partySize}${areaText} is scheduled for ${date} at ${time}. Reply here if anything changes.`;
}
