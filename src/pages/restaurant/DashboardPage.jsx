import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';

const RESERVATIONS_VIEW_KEY = 'merxus_dashboard_reservations_view';

export default function DashboardPage() {
  const { user, userClaims, restaurantId } = useAuth();
  
  // Load saved reservations view preference (today/week)
  const [reservationsView, setReservationsView] = useState(() => {
    try {
      const saved = localStorage.getItem(RESERVATIONS_VIEW_KEY);
      return saved === 'week' ? 'week' : 'today';
    } catch {
      return 'today';
    }
  });
  
  // Save preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem(RESERVATIONS_VIEW_KEY, reservationsView);
    } catch (err) {
      console.error('Failed to save reservations view preference:', err);
    }
  }, [reservationsView]);

  // Calculate current year and month for comparison
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  }, []);

  // Calculate start of today for call filtering
  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Calculate start of this week (Sunday)
  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day; // Get Sunday of this week
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }, []);

  // Fetch orders
  const ordersCollectionPath = restaurantId ? `restaurants/${restaurantId}/orders` : null;
  const { data: orders = [], loading: ordersLoading } = useFirestoreCollection(
    ordersCollectionPath,
    {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 500, // Get enough to calculate stats
    }
  );

  // Fetch reservations
  const reservationsCollectionPath = restaurantId ? `restaurants/${restaurantId}/reservations` : null;
  const { data: reservations = [], loading: reservationsLoading } = useFirestoreCollection(
    reservationsCollectionPath,
    {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 500,
    }
  );

  // Fetch calls from callSessions collection (root level) filtered by restaurantId
  const { data: calls = [], loading: callsLoading } = useFirestoreCollection(
    restaurantId ? 'callSessions' : null,
    restaurantId
      ? {
          where: [{ field: 'restaurantId', operator: '==', value: restaurantId }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
          limit: 500,
        }
      : {}
  );

  // Calculate stats
  const stats = useMemo(() => {
    // Orders this month - handle Firestore Timestamp and regular dates
    const ordersThisMonth = orders.filter((order) => {
      if (!order.createdAt) return false;
      
      // Handle Firestore Timestamp - try multiple formats
      let orderDate;
      try {
        if (typeof order.createdAt.toDate === 'function') {
          orderDate = order.createdAt.toDate();
        } else if (order.createdAt.seconds) {
          orderDate = new Date(order.createdAt.seconds * 1000);
        } else if (order.createdAt._seconds) {
          orderDate = new Date(order.createdAt._seconds * 1000);
        } else {
          orderDate = new Date(order.createdAt);
        }
        
        // Check if date is valid
        if (isNaN(orderDate.getTime())) {
          return false;
        }
        
        // Compare year and month directly (avoids timezone issues)
        const orderYear = orderDate.getFullYear();
        const orderMonth = orderDate.getMonth();
        return orderYear === currentYearMonth.year && orderMonth === currentYearMonth.month;
      } catch (err) {
        console.error('Error parsing order date:', err, order);
        return false;
      }
    });

    // Calls today - check both startedAt and createdAt fields
    const callsToday = calls.filter((call) => {
      const dateField = call.startedAt || call.createdAt;
      if (!dateField) return false;
      const callDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
      return callDate >= startOfToday;
    });

    // Reservations - filter by today or this week based on toggle
    const reservationsCount = reservations.filter((reservation) => {
      if (!reservation.createdAt) return false;
      
      // Handle Firestore Timestamp
      let reservationDate;
      try {
        if (typeof reservation.createdAt.toDate === 'function') {
          reservationDate = reservation.createdAt.toDate();
        } else if (reservation.createdAt.seconds) {
          reservationDate = new Date(reservation.createdAt.seconds * 1000);
        } else if (reservation.createdAt._seconds) {
          reservationDate = new Date(reservation.createdAt._seconds * 1000);
        } else {
          reservationDate = new Date(reservation.createdAt);
        }
        
        if (isNaN(reservationDate.getTime())) {
          return false;
        }
        
        // Filter based on view preference
        if (reservationsView === 'today') {
          return reservationDate >= startOfToday;
        } else {
          // Week view
          return reservationDate >= startOfWeek;
        }
      } catch (err) {
        console.error('Error parsing reservation date:', err, reservation);
        return false;
      }
    }).length;

    return {
      ordersThisMonth: ordersThisMonth.length,
      callsToday: callsToday.length,
      reservationsCount,
    };
  }, [orders, calls, reservations, currentYearMonth, startOfToday, startOfWeek, reservationsView]);

  const isLoading = ordersLoading || callsLoading || reservationsLoading;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Orders</h3>
          {isLoading ? (
            <LoadingSpinner text="" />
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">{stats.ordersThisMonth}</p>
              <p className="text-sm text-gray-600 mt-2">This month</p>
            </>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Calls</h3>
          {isLoading ? (
            <LoadingSpinner text="" />
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">{stats.callsToday}</p>
              <p className="text-sm text-gray-600 mt-2">Today</p>
            </>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Total Reservations</h3>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setReservationsView('today')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  reservationsView === 'today'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setReservationsView('week')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  reservationsView === 'week'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
            </div>
          </div>
          {isLoading ? (
            <LoadingSpinner text="" />
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">{stats.reservationsCount}</p>
              <p className="text-sm text-gray-600 mt-2">
                {reservationsView === 'today' ? 'Today' : 'This week'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/restaurant/orders" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">📦 View Orders</h3>
            <p className="text-sm text-gray-600">Manage incoming orders</p>
          </a>
          <a href="/restaurant/menu" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">🍽️ Menu Management</h3>
            <p className="text-sm text-gray-600">Add, edit, and manage menu items</p>
          </a>
          <a href="/restaurant/settings" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">⚙️ Settings</h3>
            <p className="text-sm text-gray-600">Configure restaurant, hours, AI settings</p>
          </a>
          <a href="/restaurant/customers" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">👥 View Customers</h3>
            <p className="text-sm text-gray-600">Manage customer relationships</p>
          </a>
          <a href="/restaurant/calls" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">📞 Calls & Messages</h3>
            <p className="text-sm text-gray-600">View call history and transcripts</p>
          </a>
          {userClaims?.role === 'owner' && (
            <a href="/restaurant/users" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-1">👤 Team & Access</h3>
              <p className="text-sm text-gray-600">Manage team members and permissions</p>
            </a>
          )}
        </div>
      </div>

      {userClaims && (
        <div className="mt-6 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Role: <span className="font-medium text-gray-900">{userClaims.role}</span></p>
            <p>Restaurant ID: <span className="font-medium text-gray-900">{userClaims.restaurantId || 'N/A'}</span></p>
            <p>Email: <span className="font-medium text-gray-900">{user?.email}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

