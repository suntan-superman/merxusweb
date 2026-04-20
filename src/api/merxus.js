import { apiClient } from './client';

function buildAnalyticsParams(options = {}) {
  const params = {};
  if (options.days != null) params.days = options.days;
  if (options.trendDays != null) params.trendDays = options.trendDays;
  return params;
}

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

// Voice Services / Offices
export async function fetchAllVoices() {
  const res = await apiClient.get('/merxus/voices');
  return res.data;
}

export async function createVoice(payload) {
  const res = await apiClient.post('/merxus/voices', payload);
  return res.data;
}

export async function getVoice(voiceId) {
  const res = await apiClient.get(`/merxus/voices/${voiceId}`);
  return res.data;
}

export async function updateVoice(voiceId, payload) {
  const res = await apiClient.patch(`/merxus/voices/${voiceId}`, payload);
  return res.data;
}

export async function deleteVoice(voiceId) {
  const res = await apiClient.delete(`/merxus/voices/${voiceId}`);
  return res.data;
}

export async function resendVoiceInvitation(voiceId) {
  const res = await apiClient.post(`/merxus/voices/${voiceId}/resend-invitation`);
  return res.data;
}

// Analytics
export async function fetchSystemAnalytics(options = {}) {
  const res = await apiClient.get('/merxus/analytics', {
    params: buildAnalyticsParams(options),
  });
  return res.data;
}

export async function fetchTenantAnalytics(options = {}) {
  const res = await apiClient.get('/merxus/analytics/tenant', {
    params: buildAnalyticsParams(options),
  });
  return res.data;
}

export async function fetchSystemOperationsAudit(options = {}) {
  const params = {};
  if (options.days != null) params.days = options.days;
  if (options.maxTenants != null) params.maxTenants = options.maxTenants;
  if (options.limitPerTenant != null) params.limitPerTenant = options.limitPerTenant;
  if (options.tenantType) params.tenantType = options.tenantType;
  if (options.tenantId) params.tenantId = options.tenantId;
  if (options.attentionOnly != null) params.attentionOnly = options.attentionOnly;

  const res = await apiClient.get('/merxus/ops-audit', { params });
  return res.data;
}

export async function fetchSystemProductionReadiness() {
  const res = await apiClient.get('/merxus/production-readiness');
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

export async function fetchBillingConfig() {
  const res = await apiClient.get('/merxus/billing-config');
  return res.data;
}

export async function updateBillingConfig(payload) {
  const res = await apiClient.patch('/merxus/billing-config', payload);
  return res.data;
}

