import { apiClient } from './client';

export async function fetchSettings() {
  const res = await apiClient.get('/settings');
  return res.data;
}

export async function updateSettings(payload) {
  const res = await apiClient.patch('/settings', payload);
  return res.data;
}

