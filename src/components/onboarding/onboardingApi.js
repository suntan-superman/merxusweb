/**
 * Onboarding API handlers - separated from UI for better testability
 */
import { apiClient } from '../../api/client';
import { createOffice } from '../../api/voice';
import { 
  DEFAULT_TIMEZONE, 
  parseMarkets, 
  sendFirebasePasswordReset,
  getOnboardingErrorMessage,
} from './onboardingUtils';

function buildSetupReturnPath(basePath, tenantType, tenantId) {
  const fallback = `/setup?type=${encodeURIComponent(tenantType)}&tenantId=${encodeURIComponent(tenantId)}&verified=1`;
  if (!basePath) {
    return fallback;
  }

  try {
    const url = new URL(basePath, window.location.origin);
    if (!url.searchParams.get('type')) {
      url.searchParams.set('type', tenantType);
    }
    if (!url.searchParams.get('tenantId')) {
      url.searchParams.set('tenantId', tenantId);
    }
    if (!url.searchParams.get('verified')) {
      url.searchParams.set('verified', '1');
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function ensurePasswordSetupDelivery(emailSent, invitationLink) {
  if (emailSent || invitationLink) {
    return;
  }

  throw new Error(
    'Account created, but password setup email could not be sent. Use "Forgot password" on the login page for this email.'
  );
}

function getPasswordSetupOrigin() {
  const configuredOrigin =
    import.meta.env.VITE_FRONTEND_URL ||
    import.meta.env.VITE_PUBLIC_FRONTEND_URL ||
    null;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  if (window.location.hostname.endsWith('netlify.app')) {
    return 'https://merxusllc.com';
  }

  return window.location.origin;
}

/**
 * Submit restaurant onboarding
 * @param {Object} formData - Form data
 * @returns {Promise<Object>} Result with success, emailSent, invitationLink, etc.
 */
export async function submitRestaurantOnboarding(formData, options = {}) {
  const res = await apiClient.post('/onboarding/restaurant', {
    restaurant: {
      name: formData.name,
      email: formData.ownerEmail,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      websiteUrl: formData.websiteUrl,
      cuisineType: formData.cuisineType,
      description: formData.description,
      timezone: DEFAULT_TIMEZONE,
    },
    manager: {
      email: formData.ownerEmail,
      displayName: formData.ownerName,
      role: 'owner',
    },
    plan: formData.selectedPlan,
  });

  const result = res.data;

  if (!result?.restaurantId) {
    throw new Error('Restaurant account was not created. Please contact support.');
  }

  // Try Firebase email as backup if SendGrid didn't work
  let emailSent = result.emailSent || false;
  const returnToPath = buildSetupReturnPath(options.returnToPath, 'restaurant', result.restaurantId);
  const resetOrigin = getPasswordSetupOrigin();
  const resetUrl = `${resetOrigin}/login?mode=resetPassword&restaurantId=${result.restaurantId}&type=restaurant&returnTo=${encodeURIComponent(returnToPath)}`;
  if (!emailSent) {
    emailSent = await sendFirebasePasswordReset(
      formData.ownerEmail,
      resetUrl
    );
  }
  ensurePasswordSetupDelivery(emailSent, result.invitationLink);

  return {
    success: true,
    emailSent,
    invitationLink: result.invitationLink,
    tenantId: result.restaurantId,
    tenantType: 'restaurant',
  };
}

/**
 * Submit voice/office onboarding
 * @param {Object} formData - Form data
 * @returns {Promise<Object>} Result with success, emailSent, invitationLink, etc.
 */
export async function submitVoiceOnboarding(formData, options = {}) {
  const result = await createOffice({
    office: {
      name: formData.name,
      email: formData.ownerEmail,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      websiteUrl: formData.websiteUrl,
      businessType: formData.businessType,
      timezone: DEFAULT_TIMEZONE,
    },
    owner: {
      email: formData.ownerEmail,
      displayName: formData.ownerName,
      role: 'owner',
    },
    plan: formData.selectedPlan,
  });

  if (!result?.officeId) {
    throw new Error('Office account was not created. Please contact support.');
  }

  // Try Firebase email as backup if SendGrid didn't work
  let emailSent = result.emailSent || false;
  const returnToPath = buildSetupReturnPath(options.returnToPath, 'voice', result.officeId);
  const resetOrigin = getPasswordSetupOrigin();
  const resetUrl = `${resetOrigin}/login?mode=resetPassword&officeId=${result.officeId}&type=voice&returnTo=${encodeURIComponent(returnToPath)}`;
  if (!emailSent) {
    emailSent = await sendFirebasePasswordReset(
      formData.ownerEmail,
      resetUrl
    );
  }
  ensurePasswordSetupDelivery(emailSent, result.invitationLink);

  return {
    success: true,
    emailSent,
    invitationLink: result.invitationLink,
    tenantId: result.officeId,
    tenantType: 'voice',
  };
}

/**
 * Submit real estate/agent onboarding
 * @param {Object} formData - Form data
 * @returns {Promise<Object>} Result with success, emailSent, invitationLink, etc.
 */
export async function submitRealEstateOnboarding(formData, options = {}) {
  const marketsArray = parseMarkets(formData.markets);
  const brandName = formData.brandName.trim() || `${formData.name} Team`;

  const res = await apiClient.post('/onboarding/agent', {
    agent: {
      name: formData.name,
      brandName,
      email: formData.ownerEmail,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      websiteUrl: formData.websiteUrl,
      brokerage: formData.brokerage.trim() || null,
      licenseNumber: formData.licenseNumber.trim() || null,
      markets: marketsArray,
      timezone: DEFAULT_TIMEZONE,
    },
    owner: {
      email: formData.ownerEmail,
      displayName: formData.name, // Use agent name for real estate
      role: 'owner',
    },
    plan: formData.selectedPlan,
  });

  const result = res.data;

  if (!result?.agentId) {
    throw new Error('Agent account was not created. Please contact support.');
  }

  // Try Firebase email as backup if SendGrid didn't work
  let emailSent = result.emailSent || false;
  const returnToPath = buildSetupReturnPath(options.returnToPath, 'real_estate', result.agentId);
  const resetOrigin = getPasswordSetupOrigin();
  const resetUrl = `${resetOrigin}/login?mode=resetPassword&agentId=${result.agentId}&type=real_estate&returnTo=${encodeURIComponent(returnToPath)}`;
  if (!emailSent) {
    emailSent = await sendFirebasePasswordReset(
      formData.ownerEmail,
      resetUrl
    );
  }
  ensurePasswordSetupDelivery(emailSent, result.invitationLink);

  return {
    success: true,
    emailSent,
    invitationLink: result.invitationLink,
    tenantId: result.agentId,
    tenantType: 'real_estate',
  };
}

/**
 * Submit onboarding based on tenant type
 * @param {string} tenantType - 'restaurant' | 'voice' | 'real_estate'
 * @param {Object} formData - Form data
 * @returns {Promise<Object>} Submission result
 */
export async function submitOnboarding(tenantType, formData, options = {}) {
  try {
    switch (tenantType) {
      case 'real_estate':
        return await submitRealEstateOnboarding(formData, options);
      case 'voice':
        return await submitVoiceOnboarding(formData, options);
      case 'restaurant':
      default:
        return await submitRestaurantOnboarding(formData, options);
    }
  } catch (error) {
    console.error('Onboarding error:', error);
    throw new Error(getOnboardingErrorMessage(error));
  }
}
