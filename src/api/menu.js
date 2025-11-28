import { apiClient } from './client';

export async function fetchMenu() {
  const res = await apiClient.get('/menu');
  return res.data;
}

export async function createMenuItem(payload) {
  const res = await apiClient.post('/menu', payload);
  return res.data;
}

export async function updateMenuItem(id, payload) {
  const res = await apiClient.put(`/menu/${id}`, payload);
  return res.data;
}

export async function deleteMenuItem(id) {
  const res = await apiClient.delete(`/menu/${id}`);
  return res.data;
}

export async function toggleAvailability(id, isAvailable) {
  const res = await apiClient.patch(`/menu/${id}`, { isAvailable });
  return res.data;
}

