import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import LoadingSpinner from '../LoadingSpinner';
import './OrdersPanel.css';

const ORDER_STATUS_COLORS = {
  new: { color: '#FF6B6B', label: '🆕 New', next: 'confirmed' },
  confirmed: { color: '#4ECDC4', label: '✓ Confirmed', next: 'preparing' },
  preparing: { color: '#FFE66D', label: '👨‍🍳 Preparing', next: 'ready' },
  ready: { color: '#95E1D3', label: '📦 Ready', next: 'picked_up' },
  picked_up: { color: '#A8E6CF', label: '✅ Picked Up', next: null },
  cancelled: { color: '#999999', label: '❌ Cancelled', next: null }
};

export default function OrdersPanel({ restaurantId, filterDate, fullScreen = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Get today's date for filtering
  const todayStart = useMemo(() => {
    const date = new Date(filterDate || new Date());
    date.setHours(0, 0, 0, 0);
    return date;
  }, [filterDate]);

  const todayEnd = useMemo(() => {
    const date = new Date(todayStart);
    date.setDate(date.getDate() + 1);
    return date;
  }, [todayStart]);

  useEffect(() => {
    if (!restaurantId) return;

    // Query orders for today
    const q = query(
      collection(db, 'restaurants', restaurantId, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
      where('createdAt', '<', Timestamp.fromDate(todayEnd))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = [];

      snapshot.docs.forEach(doc => {
        const order = {
          id: doc.id,
          ...doc.data(),
          createdAtTime: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
        };
        ordersList.push(order);
      });

      // Sort by time (newest first)
      ordersList.sort((a, b) => b.createdAtTime - a.createdAtTime);
      setOrders(ordersList);
      setLoading(false);
    });

    return unsubscribe;
  }, [restaurantId, todayStart, todayEnd]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'pending') {
      return orders.filter(o => o.status === 'new' || o.status === 'confirmed' || o.status === 'preparing');
    }
    if (statusFilter === 'completed') {
      return orders.filter(o => o.status === 'picked_up' || o.status === 'cancelled');
    }
    return orders;
  }, [orders, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => !['picked_up', 'cancelled'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'picked_up').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      revenue: orders.filter(o => o.status === 'picked_up').reduce((sum, o) => sum + (o.total || 0), 0)
    };
  }, [orders]);

  const handleStatusChange = async (orderId, currentStatus) => {
    const nextStatus = ORDER_STATUS_COLORS[currentStatus]?.next;
    if (!nextStatus) return;

    try {
      const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: nextStatus,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getWaitTime = (createdAt) => {
    const now = new Date();
    const minutes = Math.floor((now - createdAt) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`orders-panel ${fullScreen ? 'full-screen' : ''}`}>
      {/* Header with stats */}
      <div className="orders-header">
        <h2>🍽️ Orders</h2>
        <div className="orders-stats">
          <div className="stat">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{stats.pending}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Ready</span>
            <span className="stat-value ready">{stats.completed}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Revenue</span>
            <span className="stat-value">${stats.revenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="orders-filter">
        <button
          className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All Orders
        </button>
        <button
          className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          Completed
        </button>
      </div>

      {/* Orders list */}
      <div className={`orders-list ${fullScreen ? 'full-height' : ''}`}>
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const statusInfo = ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.new;
            return (
              <div key={order.id} className="order-card">
                {/* Order header */}
                <div
                  className="order-header"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  <div className="order-main">
                    <div className="order-customer">
                      <span className="customer-name">{order.customerName || 'Unknown'}</span>
                      <span className="order-time">{formatTime(order.createdAtTime)}</span>
                    </div>
                    <div className="order-wait-time">{getWaitTime(order.createdAtTime)}</div>
                  </div>
                  <div className="order-type">
                    {order.orderType === 'delivery' ? '🛵' : '🚗'} {order.orderType}
                  </div>
                </div>

                {/* Order status and price */}
                <div className="order-footer">
                  <div className="order-price">
                    <span className="price">${order.total?.toFixed(2) || '0.00'}</span>
                  </div>
                  <button
                    className="status-btn"
                    style={{
                      backgroundColor: statusInfo.color,
                      color: '#fff'
                    }}
                    onClick={() => handleStatusChange(order.id, order.status)}
                    title={statusInfo.next ? `Click to mark as ${statusInfo.next}` : 'No further status'}
                  >
                    {statusInfo.label}
                  </button>
                </div>

                {/* Expanded details */}
                {expandedOrderId === order.id && (
                  <div className="order-details">
                    <div className="details-section">
                      <h4>Order Items</h4>
                      {order.items && order.items.length > 0 ? (
                        <ul className="items-list">
                          {order.items.map((item, idx) => (
                            <li key={idx}>
                              <span className="item-qty">{item.quantity}x</span>
                              <span className="item-name">{item.name}</span>
                              <span className="item-price">${item.price?.toFixed(2) || '0.00'}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-items">No items recorded</p>
                      )}
                    </div>

                    <div className="details-section">
                      <h4>Pricing</h4>
                      <div className="pricing-breakdown">
                        <div className="pricing-row">
                          <span>Subtotal:</span>
                          <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="pricing-row">
                          <span>Tax:</span>
                          <span>${order.tax?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="pricing-row total">
                          <span>Total:</span>
                          <span>${order.total?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    {order.customerPhone && (
                      <div className="details-section">
                        <h4>Customer Contact</h4>
                        <a href={`tel:${order.customerPhone}`} className="phone-link">
                          📞 {order.customerPhone}
                        </a>
                      </div>
                    )}

                    {order.notes && (
                      <div className="details-section">
                        <h4>Notes</h4>
                        <p className="notes">{order.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
