import apiClient from './client';

/**
 * Get current subscription status
 */
export const getSubscription = async () => {
  const response = await apiClient.get('/billing/subscription');
  return response.data;
};

/**
 * Create Stripe checkout session
 * @param {string} plan - 'basic' | 'professional' | 'enterprise'
 */
export const createCheckoutSession = async (plan) => {
  const response = await apiClient.post('/billing/create-checkout-session', { plan });
  return response.data;
};

/**
 * Cancel subscription (at period end)
 */
export const cancelSubscription = async () => {
  const response = await apiClient.post('/billing/cancel-subscription');
  return response.data;
};
