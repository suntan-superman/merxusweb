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
