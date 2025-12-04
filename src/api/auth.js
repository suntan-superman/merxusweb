import apiClient from './client';

/**
 * Get current user claims
 */
export const getClaims = async () => {
  const response = await apiClient.get('/auth/claims');
  return response.data;
};

/**
 * Refresh user custom claims (fixes missing tenantId)
 */
export const refreshClaims = async () => {
  const response = await apiClient.post('/auth/refresh-claims');
  return response.data;
};
