import { useEffect, useState, useMemo } from 'react';
import { updateOrderStatus } from '../../api/orders';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { useNewItemNotifications } from '../../hooks/useNotifications';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import OrdersToolbar from '../../components/orders/OrdersToolbar';
import OrdersTable from '../../components/orders/OrdersTable';
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer';

export default function OrdersPage() {
  const { restaurantId } = useAuth();
  const [filters, setFilters] = useState({
    status: 'active',
    orderType: 'all',
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  // Build Firestore collection path
  const collectionPath = restaurantId ? `restaurants/${restaurantId}/orders` : null;

  // Build query options
  const queryOptions = useMemo(() => {
    const options = {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 100,
    };

    if (filters.orderType !== 'all') {
      options.where = [{ field: 'orderType', operator: '==', value: filters.orderType }];
    }

    return options;
  }, [filters.orderType]);

  // Use Firestore real-time listener
  const { data: orders = [], loading, error: listenerError } = useFirestoreCollection(
    collectionPath,
    queryOptions
  );

  // Show notifications for new orders
  useNewItemNotifications(orders, 'order', { autoRequest: true });

  // Update error state if listener has error
  useEffect(() => {
    if (listenerError) {
      setError('Failed to load orders. Please refresh the page.');
    }
  }, [listenerError]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'escape': () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        setSelectedOrder(null);
      }
    },
    'ctrl+k': () => {
      // Focus search if available
      const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
  });

  function handleFilterChange(nextFilters) {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
  }

  function openOrder(order) {
    setSelectedOrder(order);
    setDrawerOpen(true);
  }

  async function handleStatusChange(order, nextStatus) {
    try {
      setUpdatingId(order.id);
      const updated = await updateOrderStatus(order.id, nextStatus);
      // Orders will update automatically via Firestore listener
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(updated);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filters.orderType !== 'all' && order.orderType !== filters.orderType) {
      return false;
    }

    if (filters.status === 'active') {
      return ['new', 'accepted', 'in_progress', 'ready'].includes(order.status);
    }

    if (filters.status === 'all') {
      return true;
    }

    return order.status === filters.status;
  });

  const activeOrders = filteredOrders.filter((o) =>
    ['new', 'accepted', 'in_progress', 'ready'].includes(o.status)
  );
  const completedOrders = filteredOrders.filter((o) =>
    ['completed', 'cancelled'].includes(o.status)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage orders from AI phone assistant and other channels
          </p>
        </div>
      </div>

      <OrdersToolbar filters={filters} onChange={handleFilterChange} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <LoadingSpinner text="Loading orders…" />
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Active Orders</h3>
              <span className="text-xs text-gray-500">{activeOrders.length} active</span>
            </div>
            <OrdersTable
              orders={activeOrders}
              onOrderClick={openOrder}
              onStatusChange={handleStatusChange}
              updatingId={updatingId}
            />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between mt-4">
              <h3 className="text-sm font-semibold text-gray-700">Completed & Cancelled</h3>
              <span className="text-xs text-gray-500">{completedOrders.length} shown</span>
            </div>
            <OrdersTable
              orders={completedOrders}
              onOrderClick={openOrder}
              onStatusChange={handleStatusChange}
              updatingId={updatingId}
            />
          </section>
        </>
      )}

      <OrderDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        order={selectedOrder}
        onStatusChange={handleStatusChange}
        updatingId={updatingId}
      />
    </div>
  );
}

