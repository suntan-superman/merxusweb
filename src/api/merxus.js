import { apiClient } from './client';

// Restaurants
export async function fetchAllRestaurants() {
  const res = await apiClient.get('/merxus/restaurants');
  return res.data;
}

export async function createRestaurant(payload) {
  const res = await apiClient.post('/merxus/restaurants', payload);
  return res.data;
}

export async function getRestaurant(restaurantId) {
  const res = await apiClient.get(`/merxus/restaurants/${restaurantId}`);
  return res.data;
}

export async function updateRestaurant(restaurantId, payload) {
  const res = await apiClient.patch(`/merxus/restaurants/${restaurantId}`, payload);
  return res.data;
}

export async function deleteRestaurant(restaurantId) {
  const res = await apiClient.delete(`/merxus/restaurants/${restaurantId}`);
  return res.data;
}

export async function resendInvitation(restaurantId) {
  const res = await apiClient.post(`/merxus/restaurants/${restaurantId}/resend-invitation`);
  return res.data;
}

// Menu management for Merxus admins
export async function fetchRestaurantMenu(restaurantId) {
  const res = await apiClient.get(`/merxus/restaurants/${restaurantId}/menu`);
  return res.data;
}

export async function createRestaurantMenuItem(restaurantId, payload) {
  const res = await apiClient.post(`/merxus/restaurants/${restaurantId}/menu`, payload);
  return res.data;
}

export async function updateRestaurantMenuItem(restaurantId, itemId, payload) {
  const res = await apiClient.put(`/merxus/restaurants/${restaurantId}/menu/${itemId}`, payload);
  return res.data;
}

export async function deleteRestaurantMenuItem(restaurantId, itemId) {
  const res = await apiClient.delete(`/merxus/restaurants/${restaurantId}/menu/${itemId}`);
  return res.data;
}

export async function toggleRestaurantMenuItemAvailability(restaurantId, itemId, isAvailable) {
  const res = await apiClient.patch(`/merxus/restaurants/${restaurantId}/menu/${itemId}`, { isAvailable });
  return res.data;
}

// Analytics
export async function fetchSystemAnalytics() {
  const res = await apiClient.get('/merxus/analytics');
  return res.data;
}

// System Settings
export async function fetchSystemSettings() {
  const res = await apiClient.get('/merxus/settings');
  return res.data;
}

export async function updateSystemSettings(payload) {
  const res = await apiClient.patch('/merxus/settings', payload);
  return res.data;
}

