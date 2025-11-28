import { apiClient } from './client';

export async function fetchUsers() {
  const res = await apiClient.get('/admin/users');
  return res.data;
}

export async function inviteUser(payload) {
  const res = await apiClient.post('/admin/users/invite', payload);
  return res.data;
}

export async function updateUser(uid, payload) {
  const res = await apiClient.patch(`/admin/users/${uid}`, payload);
  return res.data;
}

export async function disableUser(uid) {
  const res = await apiClient.delete(`/admin/users/${uid}`);
  return res.data;
}

