import { apiClient } from './client';

export async function fetchCustomers({ limit = 100, search } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (search) params.search = search;

  const res = await apiClient.get('/customers', { params });
  return res.data;
}

export async function fetchCustomerDetail(customerId) {
  const res = await apiClient.get(`/customers/${customerId}`);
  return res.data;
}

export async function updateCustomer(customerId, payload) {
  const res = await apiClient.patch(`/customers/${customerId}`, payload);
  return res.data;
}

