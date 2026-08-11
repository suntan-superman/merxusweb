import { apiClient } from './client';

export async function fetchReviewsWorkspace(params = {}) {
  const res = await apiClient.get('/reviews', { params });
  return res.data;
}

export async function fetchReviewDetail(reviewId) {
  const res = await apiClient.get(`/reviews/${reviewId}`);
  return res.data;
}

export async function createTestReview(payload = {}) {
  const res = await apiClient.post('/reviews/test/review', payload);
  return res.data;
}

export async function generateReviewResponse(reviewId) {
  const res = await apiClient.post(`/reviews/${reviewId}/generate-response`);
  return res.data;
}

export async function approveReviewDraft(reviewId, draftId) {
  const res = await apiClient.post(`/reviews/${reviewId}/drafts/${draftId}/approve`);
  return res.data;
}

export async function updateReviewDetail(reviewId, payload = {}) {
  const res = await apiClient.patch(`/reviews/${reviewId}`, payload);
  return res.data;
}

export async function fetchReviewIntegrations() {
  const res = await apiClient.get('/reviews/integrations');
  return res.data;
}

export async function fetchReviewCapabilities() {
  const res = await apiClient.get('/reviews/capabilities');
  return res.data;
}

export async function fetchReviewOnboarding() {
  const res = await apiClient.get('/reviews/onboarding');
  return res.data;
}

export async function updateReviewOnboarding(payload = {}) {
  const res = await apiClient.patch('/reviews/onboarding', payload);
  return res.data;
}

export async function sendReviewOnboardingTestNotification(channels = []) {
  const res = await apiClient.post('/reviews/onboarding/test-notification', { channels });
  return res.data;
}

export async function fetchReviewOperationsHealth() {
  const res = await apiClient.get('/reviews/operations');
  return res.data;
}

export async function rerunReviewOperationsSync(payload = {}) {
  const res = await apiClient.post('/reviews/operations/sync', payload);
  return res.data;
}

export async function startReviewIntegrationOAuth(platform, params = {}) {
  const res = await apiClient.get(`/reviews/integrations/${platform}/oauth/start`, {
    params,
  });
  return res.data;
}

export async function validateReviewIntegrationOAuth(platform) {
  const res = await apiClient.get(`/reviews/integrations/${platform}/oauth/validate`);
  return res.data;
}

export async function syncReviewIntegration(platform) {
  const res = await apiClient.post(`/reviews/integrations/${platform}/sync`);
  return res.data;
}

export async function disconnectReviewIntegrationOAuth(platform) {
  const res = await apiClient.post(`/reviews/integrations/${platform}/disconnect`);
  return res.data;
}

export async function fetchReviewSyncRuns(params = {}) {
  const res = await apiClient.get('/reviews/sync-runs', { params });
  return res.data;
}

export async function fetchReviewSyncRunAnalytics(params = {}) {
  const res = await apiClient.get('/reviews/sync-runs/analytics', { params });
  return res.data;
}

export async function fetchReviewSyncRunDetail(runId) {
  const res = await apiClient.get(`/reviews/sync-runs/${runId}`);
  return res.data;
}

export async function fetchFeedbackSettings() {
  const res = await apiClient.get('/reviews/feedback-settings');
  return res.data;
}

export async function fetchInternalFeedbackQueue(params = {}) {
  const res = await apiClient.get('/reviews/internal-feedback', { params });
  return res.data;
}

export async function fetchInternalFeedbackDetail(feedbackId) {
  const res = await apiClient.get(`/reviews/internal-feedback/${feedbackId}`);
  return res.data;
}

export async function updateReviewIntegration(platform, payload = {}) {
  const res = await apiClient.patch(`/reviews/integrations/${platform}`, payload);
  return res.data;
}

export async function updateFeedbackSettings(payload = {}) {
  const res = await apiClient.patch('/reviews/feedback-settings', payload);
  return res.data;
}

export async function updateInternalFeedback(feedbackId, payload = {}) {
  const res = await apiClient.patch(`/reviews/internal-feedback/${feedbackId}`, payload);
  return res.data;
}
