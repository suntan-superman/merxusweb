import { apiClient } from './client';

export async function fetchRestaurantBookings({ status = '', startDate = '', endDate = '', limit = 250, debug = false } = {}) {
  const params = {};
  if (status) params.status = status;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (limit) params.limit = limit;
  if (debug) params.debug = '1';

  const res = await apiClient.get('/restaurant-bookings', { params });
  const bookings = res.data?.bookings || [];
  Object.defineProperty(bookings, '__debug', {
    value: res.data?.debug || null,
    enumerable: false,
  });
  return bookings;
}

export async function fetchRestaurantBookingSettings() {
  const res = await apiClient.get('/restaurant-bookings/settings');
  return res.data?.settings || null;
}

export async function updateRestaurantBookingSettings(settings) {
  const res = await apiClient.patch('/restaurant-bookings/settings', settings);
  return res.data?.settings || null;
}

export async function fetchRestaurantBookingAreas() {
  const res = await apiClient.get('/restaurant-bookings/areas');
  return res.data?.areas || [];
}

export async function createRestaurantBookingArea(area) {
  const res = await apiClient.post('/restaurant-bookings/areas', area);
  return res.data?.area || null;
}

export async function updateRestaurantBookingArea(areaId, patch) {
  const res = await apiClient.patch(`/restaurant-bookings/areas/${areaId}`, patch);
  return res.data?.area || null;
}

export async function createRestaurantBooking(booking) {
  const res = await apiClient.post('/restaurant-bookings', booking);
  return res.data?.booking || null;
}

export async function confirmRestaurantBooking(bookingId, { notifyCustomer = true } = {}) {
  const res = await apiClient.post(`/restaurant-bookings/${bookingId}/confirm`, {
    notifyCustomer,
  });
  return res.data?.booking;
}

export async function declineRestaurantBooking(bookingId, { reason = '', notifyCustomer = true } = {}) {
  const res = await apiClient.post(`/restaurant-bookings/${bookingId}/decline`, {
    reason,
    notifyCustomer,
  });
  return res.data?.booking;
}

export async function cancelRestaurantBooking(bookingId, { reason = '', notifyCustomer = true } = {}) {
  const res = await apiClient.post(`/restaurant-bookings/${bookingId}/cancel`, {
    reason,
    notifyCustomer,
    cancelledBy: 'staff',
  });
  return res.data?.booking;
}

export async function updateRestaurantBooking(bookingId, patch) {
  const res = await apiClient.patch(`/restaurant-bookings/${bookingId}`, patch);
  return res.data?.booking || null;
}
