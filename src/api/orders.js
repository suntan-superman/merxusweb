import { apiClient } from './client';

export async function fetchOrders({ limit = 50, status, orderType } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (status) params.status = status;
  if (orderType) params.orderType = orderType;

  const res = await apiClient.get('/orders', { params });
  return res.data;
}

export async function updateOrderStatus(orderId, status, updates = {}) {
  const res = await apiClient.patch(`/orders/${orderId}`, {
    status,
    ...updates,
  });
  return res.data;
}

export async function getOrder(orderId) {
  const res = await apiClient.get(`/orders/${orderId}`);
  return res.data;
}

