import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import FirstPortalChecklist from '../../components/onboarding/FirstPortalChecklist';
import { CallVolumeChart, PeakHoursChart, ConversionChart, PopularItemsChart, RevenueChart } from '../../components/analytics';

const RESERVATIONS_VIEW_KEY = 'merxus_dashboard_reservations_view';

export default function DashboardPage() {
  const { user, userClaims, restaurantId } = useAuth();
  const tenantType = userClaims?.type;
  
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

  // ===== RESTAURANT-SPECIFIC DATA =====
  // Fetch orders (restaurants only)
  const ordersCollectionPath = (tenantType === 'restaurant' && restaurantId) ? `restaurants/${restaurantId}/orders` : null;
  const { data: orders = [], loading: ordersLoading } = useFirestoreCollection(
    ordersCollectionPath,
    {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 500,
    }
  );

  // Fetch reservations (restaurants only)
  const reservationsCollectionPath = (tenantType === 'restaurant' && restaurantId) ? `restaurants/${restaurantId}/reservations` : null;
  const { data: reservations = [], loading: reservationsLoading } = useFirestoreCollection(
    reservationsCollectionPath,
    {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 500,
    }
  );

  // Fetch calls (all tenant types)
  const callsQuery = tenantType === 'restaurant' 
    ? { where: [{ field: 'restaurantId', operator: '==', value: restaurantId }] }
    : tenantType === 'real_estate'
    ? { where: [{ field: 'agentId', operator: '==', value: restaurantId }] }
    : tenantType === 'voice' || tenantType === 'general'
    ? { where: [{ field: 'officeId', operator: '==', value: restaurantId }] }
    : {};

  const { data: calls = [], loading: callsLoading } = useFirestoreCollection(
    restaurantId ? 'callSessions' : null,
    restaurantId ? {
      ...callsQuery,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 500,
    } : {}
  );

  // Calculate stats
  const stats = useMemo(() => {
    // Orders this month (restaurants only)
    let ordersThisMonth = 0;
    if (tenantType === 'restaurant') {
      ordersThisMonth = orders.filter((order) => {
        if (!order.createdAt) return false;
        
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
          
          if (isNaN(orderDate.getTime())) {
            return false;
          }
          
          const orderYear = orderDate.getFullYear();
          const orderMonth = orderDate.getMonth();
          return orderYear === currentYearMonth.year && orderMonth === currentYearMonth.month;
        } catch (err) {
          console.error('Error parsing order date:', err, order);
          return false;
        }
      }).length;
    }

    // Calls today
    const callsToday = calls.filter((call) => {
      const dateField = call.startedAt || call.createdAt;
      if (!dateField) return false;
      const callDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
      return callDate >= startOfToday;
    });

    // Reservations (restaurants only)
    let reservationsCount = 0;
    if (tenantType === 'restaurant') {
      reservationsCount = reservations.filter((reservation) => {
        if (!reservation.createdAt) return false;
        
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
          
          if (reservationsView === 'today') {
            return reservationDate >= startOfToday;
          } else {
            return reservationDate >= startOfWeek;
          }
        } catch (err) {
          console.error('Error parsing reservation date:', err, reservation);
          return false;
        }
      }).length;
    }

    return {
      ordersThisMonth,
      callsToday: callsToday.length,
      reservationsCount,
    };
  }, [orders, calls, reservations, currentYearMonth, startOfToday, startOfWeek, reservationsView, tenantType]);

  const isLoading = ordersLoading || callsLoading || reservationsLoading;

  // Get tenant-specific labels and colors
  const getTenantLabel = () => {
    switch (tenantType) {
      case 'restaurant':
        return 'Restaurant';
      case 'real_estate':
        return 'Real Estate Agency';
      case 'voice':
      case 'general':
        return 'Office';
      default:
        return 'Business';
    }
  };

  // Get Quick Action Links based on tenant type
  const getQuickActions = () => {
    const baseActions = [];
    
    if (tenantType === 'restaurant') {
      return [
        { href: '/restaurant/orders', icon: '📦', label: 'View Orders', desc: 'Manage incoming orders' },
        { href: '/restaurant/menu', icon: '🍽️', label: 'Menu Management', desc: 'Add, edit, and manage menu items' },
        { href: '/restaurant/sms', icon: '💬', label: 'SMS Inbox', desc: 'Review texts, follow-ups, and opt-outs' },
        { href: '/restaurant/settings', icon: '⚙️', label: 'Settings', desc: 'Configure restaurant, hours, AI settings' },
        { href: '/restaurant/customers', icon: '👥', label: 'View Customers', desc: 'Manage customer relationships' },
        { href: '/restaurant/calls', icon: '📞', label: 'Calls & Messages', desc: 'View call history and transcripts' },
        userClaims?.role === 'owner' && { href: '/restaurant/users', icon: '👤', label: 'Team & Access', desc: 'Manage team members and permissions' },
      ];
    } else if (tenantType === 'real_estate') {
      return [
        { href: '/estate/listings', icon: '🏠', label: 'Manage Listings', desc: 'Add and manage property listings' },
        { href: '/estate/sms', icon: '💬', label: 'SMS Inbox', desc: 'Review inquiry texts and suppressed numbers' },
        { href: '/estate/settings', icon: '⚙️', label: 'Settings', desc: 'Configure agency details and AI settings' },
        { href: '/estate/calls', icon: '📞', label: 'Calls & Messages', desc: 'View inquiry calls and messages' },
        userClaims?.role === 'owner' && { href: '/estate/users', icon: '👤', label: 'Team & Access', desc: 'Manage team members and permissions' },
      ];
    } else if (tenantType === 'voice' || tenantType === 'general') {
      return [
        { href: '/voice/settings', icon: '⚙️', label: 'Settings', desc: 'Configure office details and AI settings' },
        { href: '/voice/sms', icon: '💬', label: 'SMS Inbox', desc: 'Review business texts, replies, and opt-outs' },
        { href: '/voice/calls', icon: '📞', label: 'Calls & Messages', desc: 'View call history and transcripts' },
        userClaims?.role === 'owner' && { href: '/voice/users', icon: '👤', label: 'Team & Access', desc: 'Manage team members and permissions' },
      ];
    }

    return baseActions.filter(Boolean);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {tenantType === 'restaurant' && (
          <a 
            href="/restaurant/active-dashboard" 
            className="text-primary-600 hover:text-primary-700 font-medium text-sm mt-2 inline-block"
          >
            → Active Dashboard
          </a>
        )}
        <p className="text-gray-600 mt-2">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
        </p>
        <p className="text-sm text-gray-500 mt-1">{getTenantLabel()}</p>
      </div>

      <FirstPortalChecklist
        tenantType={tenantType}
        tenantId={restaurantId}
        userId={user?.uid}
        className="mb-6"
      />

      {/* Restaurant-specific stats */}
      {tenantType === 'restaurant' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
      )}

      {/* All tenant types - Calls stat */}
      {(tenantType === 'real_estate' || tenantType === 'voice' || tenantType === 'general') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Today's Calls</h3>
            {isLoading ? (
              <LoadingSpinner text="" />
            ) : (
              <>
                <p className="text-3xl font-bold text-primary-600">{stats.callsToday}</p>
                <p className="text-sm text-gray-600 mt-2">Incoming inquiries</p>
              </>
            )}
          </div>

          {tenantType === 'real_estate' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Listings</h3>
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-sm text-gray-600 mt-2">Currently listed</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Section - Restaurant */}
      {tenantType === 'restaurant' && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">📊 Analytics</h2>
            <span className="text-sm text-gray-500">
              {calls.length} calls • {orders.length} orders
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CallVolumeChart calls={calls} title="Call Volume Trend" />
            <RevenueChart orders={orders} title="Revenue Trend" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeakHoursChart calls={calls} title="Peak Call Times" />
            <PopularItemsChart orders={orders} title="Popular Items" />
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <ConversionChart calls={calls} orders={orders} title="Call Outcomes" context="restaurant" />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getQuickActions().map((action, idx) => (
            <a key={idx} href={action.href} className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-1">{action.icon} {action.label}</h3>
              <p className="text-sm text-gray-600">{action.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Account Info */}
      {userClaims && (
        <div className="mt-6 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Type: <span className="font-medium text-gray-900">{getTenantLabel()}</span></p>
            <p>Role: <span className="font-medium text-gray-900">{userClaims.role}</span></p>
            {restaurantId && (
              <p>ID: <span className="font-medium text-gray-900">{restaurantId}</span></p>
            )}
            <p>Email: <span className="font-medium text-gray-900">{user?.email}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

