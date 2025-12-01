import { apiClient } from './client';

export async function fetchReservations({ limit = 50, status } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (status) params.status = status;

  const res = await apiClient.get('/reservations', { params });
  return res.data;
}

export async function updateReservationStatus(reservationId, status, updates = {}) {
  const res = await apiClient.patch(`/reservations/${reservationId}`, {
    status,
    ...updates,
  });
  return res.data;
}

export async function getReservation(reservationId) {
  const res = await apiClient.get(`/reservations/${reservationId}`);
  return res.data;
}

export async function createReservation(reservationData) {
  const res = await apiClient.post('/reservations', reservationData);
  return res.data;
}

