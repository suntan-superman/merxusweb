import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../LoadingSpinner';
import ReservationCalendar from './ReservationCalendar';
import OrdersPanel from './OrdersPanel';
import './RestaurantDashboard.css';

export default function RestaurantDashboard() {
  const { restaurantId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'calendar', 'orders'

  if (!restaurantId) {
    return <LoadingSpinner />;
  }

  return (
    <div className="restaurant-dashboard">
      {/* Header with view toggle */}
      <div className="dashboard-header">
        <h1>Restaurant Dashboard</h1>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setViewMode('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            📅 Calendar
          </button>
          <button
            className={`toggle-btn ${viewMode === 'orders' ? 'active' : ''}`}
            onClick={() => setViewMode('orders')}
          >
            🍽️ Orders
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <div className="dashboard-container">
          <div className="dashboard-left">
            <ReservationCalendar restaurantId={restaurantId} selectedDate={selectedDate} />
          </div>
          <div className="dashboard-right">
            <OrdersPanel restaurantId={restaurantId} filterDate={selectedDate} />
          </div>
        </div>
      )}

      {/* Calendar Full View */}
      {viewMode === 'calendar' && (
        <div className="full-view">
          <ReservationCalendar restaurantId={restaurantId} selectedDate={selectedDate} fullScreen />
        </div>
      )}

      {/* Orders Full View */}
      {viewMode === 'orders' && (
        <div className="full-view">
          <OrdersPanel restaurantId={restaurantId} filterDate={selectedDate} fullScreen />
        </div>
      )}
    </div>
  );
}
