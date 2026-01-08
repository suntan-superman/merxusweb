import { apiClient } from './client';

// Real Estate Companies - Super Admin Management
export async function fetchAllRealEstateCompanies() {
  const res = await apiClient.get('/merxus/real-estate');
  return res.data;
}

export async function createRealEstateCompany(payload) {
  const res = await apiClient.post('/merxus/real-estate', payload);
  return res.data;
}

export async function getRealEstateCompany(companyId) {
  const res = await apiClient.get(`/merxus/real-estate/${companyId}`);
  return res.data;
}

export async function updateRealEstateCompany(companyId, payload) {
  const res = await apiClient.patch(`/merxus/real-estate/${companyId}`, payload);
  return res.data;
}

export async function deleteRealEstateCompany(companyId) {
  const res = await apiClient.delete(`/merxus/real-estate/${companyId}`);
  return res.data;
}

export async function resendRealEstateInvitation(companyId) {
  const res = await apiClient.post(`/merxus/real-estate/${companyId}/resend-invitation`);
  return res.data;
}
