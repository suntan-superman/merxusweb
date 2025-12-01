import { useEffect, useState, useMemo } from 'react';
import { updateReservationStatus } from '../../api/reservations';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { useNewItemNotifications } from '../../hooks/useNotifications';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReservationsToolbar from '../../components/reservations/ReservationsToolbar';
import ReservationsTable from '../../components/reservations/ReservationsTable';
import ReservationDetailDrawer from '../../components/reservations/ReservationDetailDrawer';

export default function ReservationsPage() {
  const { restaurantId } = useAuth();
  const [filters, setFilters] = useState({
    status: 'upcoming',
    dateRange: 'all',
  });
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  // Build Firestore collection path
  const collectionPath = restaurantId ? `restaurants/${restaurantId}/reservations` : null;

  // Build query options
  const queryOptions = useMemo(() => {
    const options = {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 100,
    };
    return options;
  }, []);

  // Use Firestore real-time listener
  const { data: reservations = [], loading, error: listenerError } = useFirestoreCollection(
    collectionPath,
    queryOptions
  );

  // Show notifications for new reservations
  useNewItemNotifications(reservations, 'reservation', { autoRequest: true });

  // Update error state if listener has error
  useEffect(() => {
    if (listenerError) {
      setError('Failed to load reservations. Please refresh the page.');
    }
  }, [listenerError]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'escape': () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        setSelectedReservation(null);
      }
    },
  });

  function handleFilterChange(nextFilters) {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
  }

  function openReservation(reservation) {
    setSelectedReservation(reservation);
    setDrawerOpen(true);
  }

  async function handleStatusChange(reservation, nextStatus) {
    try {
      setUpdatingId(reservation.id);
      const updated = await updateReservationStatus(reservation.id, nextStatus);
      if (selectedReservation && selectedReservation.id === reservation.id) {
        setSelectedReservation(updated);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update reservation status.');
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredReservations = reservations.filter((reservation) => {
    if (filters.status === 'upcoming') {
      return ['confirmed', 'pending'].includes(reservation.status);
    }
    if (filters.status === 'all') {
      return true;
    }
    return reservation.status === filters.status;
  });

  const upcomingReservations = filteredReservations.filter((r) =>
    ['confirmed', 'pending'].includes(r.status)
  );
  const pastReservations = filteredReservations.filter((r) =>
    ['completed', 'cancelled', 'no_show'].includes(r.status)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage reservations from AI phone assistant
          </p>
        </div>
      </div>

      <ReservationsToolbar filters={filters} onChange={handleFilterChange} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && reservations.length === 0 ? (
        <LoadingSpinner text="Loading reservations…" />
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Upcoming Reservations</h3>
              <span className="text-xs text-gray-500">{upcomingReservations.length} upcoming</span>
            </div>
            <ReservationsTable
              reservations={upcomingReservations}
              onReservationClick={openReservation}
              onStatusChange={handleStatusChange}
              updatingId={updatingId}
            />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between mt-4">
              <h3 className="text-sm font-semibold text-gray-700">Past & Cancelled</h3>
              <span className="text-xs text-gray-500">{pastReservations.length} shown</span>
            </div>
            <ReservationsTable
              reservations={pastReservations}
              onReservationClick={openReservation}
              onStatusChange={handleStatusChange}
              updatingId={updatingId}
            />
          </section>
        </>
      )}

      <ReservationDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        reservation={selectedReservation}
        onStatusChange={handleStatusChange}
        updatingId={updatingId}
      />
    </div>
  );
}

