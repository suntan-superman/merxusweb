// Voice Users API Client

import apiClient from './client';

/**
 * Get all voice/office users
 */
export async function getVoiceUsers() {
  const response = await apiClient.get('/voice/users');
  return response.data;
}

/**
 * Invite a new voice/office user
 */
export async function inviteVoiceUser(userData) {
  const response = await apiClient.post('/voice/users/invite', userData);
  return response.data;
}

/**
 * Update a voice/office user's role or status
 */
export async function updateVoiceUser(uid, updates) {
  const response = await apiClient.patch(`/voice/users/${uid}`, updates);
  return response.data;
}

/**
 * Delete/disable a voice/office user
 */
export async function deleteVoiceUser(uid) {
  const response = await apiClient.delete(`/voice/users/${uid}`);
  return response.data;
}
