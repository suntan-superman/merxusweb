import { apiClient } from './client';

export async function fetchSmsSettings() {
  const res = await apiClient.get('/sms/settings');
  return res.data;
}

export async function updateSmsSettings(payload) {
  const res = await apiClient.patch('/sms/settings', payload);
  return res.data;
}

export async function sendSmsTest(payload) {
  const res = await apiClient.post('/sms/test-send', payload);
  return res.data;
}

export async function sendManualSms(payload) {
  const res = await apiClient.post('/sms/manual-send', payload);
  return res.data;
}

export async function fetchSmsMessages(limit = 50) {
  const res = await apiClient.get('/sms/messages', { params: { limit } });
  return res.data;
}

export async function fetchSmsConversations(limit = 50) {
  const res = await apiClient.get('/sms/conversations', { params: { limit } });
  return res.data;
}

export async function fetchSmsOptOuts(limit = 50) {
  const res = await apiClient.get('/sms/opt-outs', { params: { limit } });
  return res.data;
}

export async function fetchSmsAnalytics(days = 30) {
  const res = await apiClient.get('/sms/analytics', { params: { days } });
  return res.data;
}

export async function fetchSmsNotificationRouting() {
  const res = await apiClient.get('/sms/notification-routing');
  return res.data;
}

export async function fetchSmsNotificationEvents(limitOrParams = 50, days = 30) {
  const params =
    typeof limitOrParams === 'object'
      ? limitOrParams
      : { limit: limitOrParams, days };
  const res = await apiClient.get('/sms/notification-events', { params });
  return res.data;
}

export async function fetchSmsNotificationEventDetail(eventId, retryLimit = 25) {
  const res = await apiClient.get(`/sms/notification-events/${eventId}`, {
    params: { retryLimit },
  });
  return res.data;
}

export async function fetchSmsNotificationJobRuns(limitOrParams = 25, days = 30) {
  const params =
    typeof limitOrParams === 'object'
      ? limitOrParams
      : { limit: limitOrParams, days };
  const res = await apiClient.get('/sms/notification-job-runs', { params });
  return res.data;
}

export async function fetchSmsNotificationRunAlerts(limitOrParams = 20, days = 30) {
  const params =
    typeof limitOrParams === 'object'
      ? limitOrParams
      : { limit: limitOrParams, days };
  const res = await apiClient.get('/sms/notification-run-alerts', { params });
  return res.data;
}

export async function fetchSmsNotificationRunAlertAnalytics(days = 30, limit = 200) {
  const res = await apiClient.get('/sms/notification-run-alert-analytics', {
    params: { days, limit, status: 'active' },
  });
  return res.data;
}

export async function acknowledgeSmsNotificationRunAlert(alertId) {
  const res = await apiClient.post(`/sms/notification-run-alerts/${alertId}/acknowledge`);
  return res.data;
}

export async function claimSmsNotificationRunAlert(alertId) {
  const res = await apiClient.post(`/sms/notification-run-alerts/${alertId}/claim`);
  return res.data;
}

export async function releaseSmsNotificationRunAlert(alertId) {
  const res = await apiClient.post(`/sms/notification-run-alerts/${alertId}/release`);
  return res.data;
}

export async function addSmsNotificationRunAlertNote(alertId, payload = {}) {
  const res = await apiClient.post(`/sms/notification-run-alerts/${alertId}/notes`, payload);
  return res.data;
}

export async function snoozeSmsNotificationRunAlert(alertId, payload = {}) {
  const res = await apiClient.post(`/sms/notification-run-alerts/${alertId}/snooze`, payload);
  return res.data;
}

export async function resumeSmsNotificationRunAlert(alertId) {
  const res = await apiClient.post(`/sms/notification-run-alerts/${alertId}/resume`);
  return res.data;
}

export async function escalateSmsNotificationRunAlerts(payload = {}) {
  const res = await apiClient.post('/sms/notification-run-alerts/escalate', payload);
  return res.data;
}

export async function runSmsSpeechHealthMonitor(payload = {}) {
  const res = await apiClient.post('/sms/speech-health/run', payload);
  return res.data;
}

export async function fetchSmsNotificationJobRunDetail(runId, limit = 50) {
  const res = await apiClient.get(`/sms/notification-job-runs/${runId}`, {
    params: { limit },
  });
  return res.data;
}

export async function fetchSmsDailyDigest(days = 1) {
  const res = await apiClient.get('/sms/daily-digest', { params: { days } });
  return res.data;
}

export async function retrySmsNotificationEvent(eventId) {
  const res = await apiClient.post(`/sms/notification-events/${eventId}/retry`);
  return res.data;
}

export async function retrySmsNotificationEventsBatch(payload = {}) {
  const res = await apiClient.post('/sms/notification-events/retry-batch', payload);
  return res.data;
}

export async function retryFailedSmsNotificationEvents(payload = {}) {
  const res = await apiClient.post('/sms/notification-events/retry-failed', payload);
  return res.data;
}

export async function sendSmsDailyDigest(payload = {}) {
  const res = await apiClient.post('/sms/daily-digest/send', payload);
  return res.data;
}

export async function updateSmsNotificationContacts(payload) {
  const res = await apiClient.put('/sms/notification-contacts', payload);
  return res.data;
}

export async function updateSmsNotificationGroups(payload) {
  const res = await apiClient.put('/sms/notification-groups', payload);
  return res.data;
}

export async function triggerSlackCommandCenterDemo(payload = {}) {
  const res = await apiClient.post('/demo/command-center', payload);
  return res.data;
}

export async function fetchSlackCommandCenterEvents(params = {}) {
  const res = await apiClient.get('/sms/slack-command-center/events', { params });
  return res.data;
}

export async function startSlackOAuth(payload = {}) {
  const res = await apiClient.get('/integrations/slack/oauth/start', {
    params: payload,
  });
  return res.data;
}

export async function validateSlackOAuth() {
  const res = await apiClient.post('/integrations/slack/validate');
  return res.data;
}

export async function fetchSlackWorkspaceDiscovery() {
  const res = await apiClient.get('/integrations/slack/discovery');
  return res.data;
}

export async function mapSlackUsers(payload = {}) {
  const res = await apiClient.post('/integrations/slack/users/map', payload);
  return res.data;
}

export async function provisionSlackChannels(payload = {}) {
  const res = await apiClient.post('/integrations/slack/channels/provision', payload);
  return res.data;
}

export async function sendSlackIntegrationTest(payload = {}) {
  const res = await apiClient.post('/integrations/slack/test', payload);
  return res.data;
}

export async function disconnectSlackIntegration() {
  const res = await apiClient.post('/integrations/slack/disconnect');
  return res.data;
}
