import { apiClient } from './client';

function getTenantBasePath(tenantType) {
  if (tenantType === 'restaurant') return '/admin';
  if (tenantType === 'voice') return '/voice';
  if (tenantType === 'real_estate') return '/estate';
  return '/admin';
}

export async function fetchTeamUsers(tenantType) {
  const res = await apiClient.get(`${getTenantBasePath(tenantType)}/users`);
  return res.data;
}

export async function inviteTeamUser(tenantType, payload) {
  const res = await apiClient.post(`${getTenantBasePath(tenantType)}/users/invite`, payload);
  return res.data;
}

export async function updateTeamUser(tenantType, uid, payload) {
  const res = await apiClient.patch(`${getTenantBasePath(tenantType)}/users/${uid}`, payload);
  return res.data;
}

export async function disableTeamUser(tenantType, uid) {
  const res = await apiClient.delete(`${getTenantBasePath(tenantType)}/users/${uid}`);
  return res.data;
}

export async function fetchTeamActivityLog(tenantType, params = {}) {
  const res = await apiClient.get(`${getTenantBasePath(tenantType)}/activity-log`, { params });
  return res.data;
}

export async function fetchPhoneVerificationStatus() {
  const res = await apiClient.get('/account/phone-verification/status');
  return res.data;
}

export async function sendPhoneVerificationCode() {
  const res = await apiClient.post('/account/phone-verification/send');
  return res.data;
}

export async function verifyPhoneVerificationCode(code) {
  const res = await apiClient.post('/account/phone-verification/verify', { code });
  return res.data;
}

export async function resolveInviteAcceptance(inviteToken) {
  const res = await apiClient.post('/account/invite/resolve', { inviteToken }, {
    headers: {
      'X-Suppress-Error-Log': 'true',
    },
  });
  return res.data;
}

export async function confirmInviteProfile(displayName) {
  const res = await apiClient.post('/account/invite/confirm-profile', { displayName });
  return res.data;
}
