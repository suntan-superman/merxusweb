import apiClient from './client';

/**
 * Get current subscription status
 */
export const getSubscription = async () => {
  const response = await apiClient.get('/billing/subscription');
  return response.data;
};

/**
 * Get dynamic pricing
 */
export const getBillingPricing = async () => {
  const response = await apiClient.get('/billing/pricing');
  return response.data;
};

/**
 * Reserve phone number before checkout
 */
export const reserveNumber = async (payload) => {
  const response = await apiClient.post('/billing/reserve-number', payload);
  return response.data;
};

/**
 * Create Stripe checkout session
 */
export const createCheckoutSession = async (payload) => {
  const response = await apiClient.post('/billing/create-checkout-session', payload);
  return response.data;
};

/**
 * Verify Stripe checkout session after redirect
 */
export const verifyCheckoutSession = async (sessionId) => {
  const response = await apiClient.get('/billing/verify-session', {
    params: { session_id: sessionId },
  });
  return response.data;
};

/**
 * Create Stripe customer portal session
 */
export const createPortalSession = async (payload = {}) => {
  const response = await apiClient.post('/billing/portal-session', payload);
  return response.data;
};

/**
 * Cancel subscription (at period end)
 */
export const cancelSubscription = async () => {
  const response = await apiClient.post('/billing/cancel-subscription');
  return response.data;
};

/**
 * Admin: Pause subscription billing for a tenant
 */
export const pauseSubscriptionForTenant = async (payload) => {
  const response = await apiClient.post('/billing/admin/pause', payload);
  return response.data;
};

/**
 * Admin: Resume subscription billing for a tenant
 */
export const resumeSubscriptionForTenant = async (payload) => {
  const response = await apiClient.post('/billing/admin/resume', payload);
  return response.data;
};

/**
 * Admin: Issue a partial refund for a tenant (amountCents required)
 */
export const createRefundForTenant = async (payload) => {
  const response = await apiClient.post('/billing/admin/refund', payload);
  return response.data;
};
