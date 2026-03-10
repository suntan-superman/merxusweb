import { apiClient } from './client';

export async function fetchGraphCustomers(params = {}) {
  const res = await apiClient.get('/graph/customers', { params });
  return res.data;
}

export async function fetchCustomer360(customerId, params = {}) {
  const res = await apiClient.get(`/graph/customers/${customerId}`, { params });
  return res.data;
}

export async function fetchCustomerTimeline(customerId, params = {}) {
  const res = await apiClient.get(`/graph/customers/${customerId}/timeline`, { params });
  return res.data;
}

export async function fetchMergeCandidates(params = {}) {
  const res = await apiClient.get('/graph/merge-candidates', { params });
  return res.data;
}

export async function fetchMergeAudits(params = {}) {
  const res = await apiClient.get('/graph/merge-audits', { params });
  return res.data;
}

export async function mergeGraphCustomers(payload) {
  const res = await apiClient.post('/graph/merge', payload);
  return res.data;
}

export async function mergeGraphProperties(payload) {
  const res = await apiClient.post('/graph/merge', {
    candidateType: 'property',
    ...payload,
  });
  return res.data;
}

export async function dismissMergeCandidate(candidateId) {
  const res = await apiClient.post(`/graph/merge-candidates/${candidateId}/dismiss`);
  return res.data;
}

export async function fetchGraphObjects(params = {}) {
  const res = await apiClient.get('/graph/objects', { params });
  return res.data;
}

export async function fetchGraphObjectDetail(objectType, objectId) {
  const res = await apiClient.get(`/graph/objects/${objectType}/${objectId}`);
  return res.data;
}

export async function updateGraphObject(objectType, objectId, payload) {
  const res = await apiClient.patch(`/graph/objects/${objectType}/${objectId}`, payload);
  return res.data;
}
