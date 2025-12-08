import apiClient from './client';

/**
 * Search for available Twilio phone numbers by area code
 */
export async function searchAvailableNumbers(areaCode) {
  const response = await apiClient.get('/twilio-provisioning/search', {
    params: { areaCode },
  });
  return response.data;
}

/**
 * List all unassigned Twilio numbers
 */
export async function listUnassignedNumbers() {
  const response = await apiClient.get('/twilio-provisioning/list');
  return response.data;
}

/**
 * Purchase a Twilio phone number
 */
export async function purchasePhoneNumber(phoneNumber, tenantType, tenantId, friendlyName, skipDbSave = false) {
  const response = await apiClient.post('/twilio-provisioning/purchase', {
    phoneNumber,
    tenantType,
    tenantId,
    friendlyName,
  }, {
    params: { skipDbSave: skipDbSave ? 'true' : 'false' },
  });
  return response.data;
}

/**
 * Release a Twilio phone number
 */
export async function releasePhoneNumber(phoneSid, tenantType, tenantId) {
  const response = await apiClient.post('/twilio-provisioning/release', {
    phoneSid,
    tenantType,
    tenantId,
  });
  return response.data;
}

/**
 * Validate Twilio credentials
 */
export async function validateTwilioCredentials(accountSid, authToken) {
  const response = await apiClient.post('/twilio-provisioning/validate', {
    accountSid,
    authToken,
  });
  return response.data;
}
