import { apiClient } from './client';

// Offices
export async function createOffice(payload) {
  try {
    console.log('Creating office with payload:', payload);
    const res = await apiClient.post('/onboarding/office', payload);
    console.log('Office creation response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error creating office:', error);
    console.error('Error response:', error.response?.data);
    // Re-throw with more context
    throw {
      message: error.response?.data?.error || error.message || 'Failed to create office',
      response: error.response,
      originalError: error
    };
  }
}

export async function fetchVoiceSettings() {
  const res = await apiClient.get('/voice/settings');
  return res.data;
}

export async function updateVoiceSettings(settings) {
  const res = await apiClient.patch('/voice/settings', settings);
  return res.data;
}

export async function resendInvitationEmail(email) {
  try {
    const res = await apiClient.post('/onboarding/resend-email', { email });
    return res.data;
  } catch (error) {
    console.error('Error resending invitation email:', error);
    throw {
      message: error.response?.data?.error || error.message || 'Failed to resend invitation email',
      response: error.response,
      originalError: error
    };
  }
}

// Routing Rules
export async function getRoutingRules() {
  const res = await apiClient.get('/voice/routing-rules');
  return res.data;
}

export async function createRoutingRule(ruleData) {
  const res = await apiClient.post('/voice/routing-rules', ruleData);
  return res.data;
}

export async function updateRoutingRule(ruleId, updates) {
  const res = await apiClient.patch(`/voice/routing-rules/${ruleId}`, updates);
  return res.data;
}

export async function deleteRoutingRule(ruleId) {
  const res = await apiClient.delete(`/voice/routing-rules/${ruleId}`);
  return res.data;
}

