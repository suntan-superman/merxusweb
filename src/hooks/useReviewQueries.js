import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  approveReviewDraft,
  createTestReview,
  fetchFeedbackSettings,
  fetchInternalFeedbackDetail,
  fetchInternalFeedbackQueue,
  fetchReviewDetail,
  fetchReviewIntegrations,
  fetchReviewsWorkspace,
  generateReviewResponse,
  updateReviewDetail,
  updateInternalFeedback,
  updateFeedbackSettings,
  updateReviewIntegration,
} from '../api/reviews';
import { fetchSmsNotificationEvents } from '../api/sms';

export const reviewKeys = {
  all: ['reviews'],
  workspaceRoot: () => [...reviewKeys.all, 'workspace'],
  workspace: (filters = {}) => [...reviewKeys.all, 'workspace', filters],
  detail: (reviewId) => [...reviewKeys.all, 'detail', reviewId],
  integrations: () => [...reviewKeys.all, 'integrations'],
  feedbackSettings: () => [...reviewKeys.all, 'feedback-settings'],
  internalFeedbackQueueRoot: () => [...reviewKeys.all, 'internal-feedback-queue'],
  internalFeedbackQueue: (filters = {}) => [...reviewKeys.all, 'internal-feedback-queue', filters],
  internalFeedbackDetail: (feedbackId) => [...reviewKeys.all, 'internal-feedback-detail', feedbackId],
  alertsRoot: () => [...reviewKeys.all, 'alerts'],
  alerts: (filters = {}) => [...reviewKeys.all, 'alerts', filters],
};

export function useReviewsWorkspace(filters = {}, options = {}) {
  return useQuery({
    queryKey: reviewKeys.workspace(filters),
    queryFn: () => fetchReviewsWorkspace(filters),
    ...options,
  });
}

export function useReviews(filters = {}, options = {}) {
  return useReviewsWorkspace(filters, options);
}

export function useReviewDetail(reviewId, options = {}) {
  return useQuery({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => fetchReviewDetail(reviewId),
    enabled: Boolean(reviewId),
    ...options,
  });
}

export function useGenerateReviewResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId) => generateReviewResponse(reviewId),
    onSuccess: (data, reviewId) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.workspaceRoot() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.alertsRoot() });
      toast.success(data?.alertsCreated?.length ? 'Draft generated and review alerts updated.' : 'Draft response generated.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to generate review response');
    },
  });
}

export function useGenerateResponse() {
  return useGenerateReviewResponse();
}

export function useCreateTestReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTestReview(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.workspaceRoot() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.feedbackSettings() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.integrations() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.alertsRoot() });
      toast.success(
        data?.alertsCreated?.length
          ? 'Test review injected and alert flow updated.'
          : 'Test review injected.'
      );
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to inject test review');
    },
  });
}

export function useApproveReviewDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, draftId }) => approveReviewDraft(reviewId, draftId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.reviewId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.workspaceRoot() });
      toast.success('Review draft approved.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to approve review draft');
    },
  });
}

export function useUpdateReviewDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, payload }) => updateReviewDetail(reviewId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.reviewId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.workspaceRoot() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.alertsRoot() });
      toast.success('Review workflow updated.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update review workflow');
    },
  });
}

export function useReviewIntegrations(options = {}) {
  return useQuery({
    queryKey: reviewKeys.integrations(),
    queryFn: fetchReviewIntegrations,
    ...options,
  });
}

export function useFeedbackSettings(options = {}) {
  return useQuery({
    queryKey: reviewKeys.feedbackSettings(),
    queryFn: fetchFeedbackSettings,
    ...options,
  });
}

export function useInternalFeedbackQueue(filters = {}, options = {}) {
  return useQuery({
    queryKey: reviewKeys.internalFeedbackQueue(filters),
    queryFn: () => fetchInternalFeedbackQueue(filters),
    ...options,
  });
}

export function useInternalFeedbackDetail(feedbackId, options = {}) {
  return useQuery({
    queryKey: reviewKeys.internalFeedbackDetail(feedbackId),
    queryFn: () => fetchInternalFeedbackDetail(feedbackId),
    enabled: Boolean(feedbackId),
    ...options,
  });
}

export function useUpdateReviewIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platform, payload }) => updateReviewIntegration(platform, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.integrations() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.feedbackSettings() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success('Review integration updated.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update review integration');
    },
  });
}

export function useUpdateFeedbackSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateFeedbackSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.feedbackSettings() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success('Feedback funnel settings updated.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update feedback settings');
    },
  });
}

export function useUpdateInternalFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feedbackId, payload }) => updateInternalFeedback(feedbackId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.internalFeedbackQueueRoot() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.internalFeedbackDetail(variables.feedbackId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.feedbackSettings() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.alertsRoot() });
      toast.success('Internal feedback updated.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update internal feedback');
    },
  });
}

export function useReviewAlerts(filters = {}, options = {}) {
  return useQuery({
    queryKey: reviewKeys.alerts(filters),
    queryFn: async () => {
      const data = await fetchSmsNotificationEvents({
        limit: filters.limit || 100,
        days: filters.days || 30,
      });

      const reviewEvents = (data?.events || []).filter((event) =>
        ['negative_review', 'review_spike', 'feedback_low_rating'].includes(String(event?.eventType || '').toLowerCase())
      );

      return {
        ...(data || {}),
        events: reviewEvents,
      };
    },
    ...options,
  });
}

export function useAlerts(filters = {}, options = {}) {
  return useReviewAlerts(filters, options);
}
