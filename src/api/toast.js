// Toast POS Integration API Client

import apiClient from './client';

/**
 * Connect Toast POS
 */
export async function connectToast(credentials) {
  const response = await apiClient.post('/toast/connect', credentials);
  return response.data;
}

/**
 * Disconnect Toast POS
 */
export async function disconnectToast() {
  const response = await apiClient.post('/toast/disconnect');
  return response.data;
}

/**
 * Get Toast connection status
 */
export async function getToastStatus() {
  const response = await apiClient.get('/toast/status');
  return response.data;
}

/**
 * Trigger manual menu sync from Toast
 */
export async function syncMenuFromToast() {
  const response = await apiClient.post('/toast/sync-menu');
  return response.data;
}

/**
 * Push a specific order to Toast
 */
export async function pushOrderToToast(orderId) {
  const response = await apiClient.post(`/toast/push-order/${orderId}`);
  return response.data;
}
