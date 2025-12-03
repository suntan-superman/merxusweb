import { apiClient } from './client';

export async function fetchCalls({ limit = 50, type, importance } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (type) params.type = type;
  if (importance) params.importance = importance;

  const res = await apiClient.get('/calls', { params });
  return res.data;
}

export async function fetchCallTranscript(callId) {
  const res = await apiClient.get(`/calls/${callId}/transcript`);
  return res.data;
}

export async function translateCallTranscript(callId, targetLanguage = 'en') {
  const res = await apiClient.post(`/calls/${callId}/translate`, { targetLanguage });
  return res.data;
}

export async function getCall(callId) {
  const res = await apiClient.get(`/calls/${callId}`);
  return res.data;
}

