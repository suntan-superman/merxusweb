import apiClient from './client';

// Get all users
export async function getAllUsers(includeDisabled = false) {
  const res = await apiClient.get('/super-admin/users', {
    params: { includeDisabled },
  });
  return res.data;
}

// Get single user
export async function getUser(uid) {
  const res = await apiClient.get(`/super-admin/users/${uid}`);
  return res.data;
}

// Create new user with password
export async function createUser(userData) {
  const res = await apiClient.post('/super-admin/users', userData);
  return res.data;
}

// Update user
export async function updateUser(uid, updates) {
  const res = await apiClient.patch(`/super-admin/users/${uid}`, updates);
  return res.data;
}

// Delete user permanently
export async function deleteUser(uid) {
  const res = await apiClient.delete(`/super-admin/users/${uid}`);
  return res.data;
}
