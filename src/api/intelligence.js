import { apiClient } from './client';

export async function fetchInteractionEvents(params = {}) {
  const res = await apiClient.get('/intelligence/events', { params });
  return res.data;
}

export async function fetchInteractionEventDetail(eventId) {
  const res = await apiClient.get(`/intelligence/events/${eventId}`);
  return res.data;
}

export async function fetchInteractionEventSource(eventId) {
  const res = await apiClient.get(`/intelligence/events/${eventId}/source`);
  return res.data;
}

export async function reviewInteractionEvent(eventId, payload) {
  const res = await apiClient.patch(`/intelligence/events/${eventId}/review`, payload);
  return res.data;
}
