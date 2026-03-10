import { apiClient } from './client';

export async function fetchSettings() {
  const res = await apiClient.get('/settings');
  return res.data;
}

export async function updateSettings(payload) {
  const res = await apiClient.patch('/settings', payload);
  return res.data;
}

export async function fetchRestaurantProviderHealth({ refresh = false } = {}) {
  const res = await apiClient.get('/settings/provider-health', {
    params: {
      refresh,
    },
  });
  return res.data;
}

export async function fetchRestaurantSpeechAnalytics({ days = 30, limit } = {}) {
  const res = await apiClient.get('/settings/speech-analytics', {
    params: {
      days,
      ...(limit ? { limit } : {}),
    },
  });
  return res.data;
}

export async function invalidateRestaurantProviderHealthCache(providerTypes = []) {
  const res = await apiClient.post('/settings/provider-health/invalidate', {
    providerTypes,
  });
  return res.data;
}

