import { apiClient } from './client';

export async function fetchReviewsWorkspace(params = {}) {
  const res = await apiClient.get('/reviews', { params });
  return res.data;
}

export async function fetchReviewDetail(reviewId) {
  const res = await apiClient.get(`/reviews/${reviewId}`);
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

export async function fetchReviewIntegrations() {
  const res = await apiClient.get('/reviews/integrations');
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
