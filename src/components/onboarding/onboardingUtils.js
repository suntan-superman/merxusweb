/**
 * Onboarding utilities and constants
 */

/**
 * Pricing information by tenant type and plan
 */
export const PRICING = {
  restaurant: {
    basic: { monthly: 199, setup: 299, planName: 'Basic' },
    enterprise: { monthly: 499, setup: 999, planName: 'Enterprise' },
    default: { monthly: 199, setup: 299, planName: 'Basic' },
  },
  voice: {
    basic: { monthly: 49, setup: 49, planName: 'Basic' },
    professional: { monthly: 99, setup: 149, planName: 'Professional' },
    enterprise: { monthly: 199, setup: 249, planName: 'Enterprise' },
    default: { monthly: 49, setup: 49, planName: 'Basic' },
  },
  real_estate: {
    basic: { monthly: 49, setup: 49, planName: 'Basic' },
    professional: { monthly: 79, setup: 99, planName: 'Professional' },
    default: { monthly: 49, setup: 49, planName: 'Basic' },
  },
};

/**
 * Get pricing info for tenant type and plan
 * @param {string} tenantType - 'restaurant' | 'voice' | 'real_estate'
 * @param {string|null} plan - Plan name or null
 * @returns {Object} Pricing info with monthly, setup, and planName
 */
export function getPricingInfo(tenantType, plan) {
  const prices = PRICING[tenantType] || PRICING.restaurant;
  return prices[plan] || prices.default;
}

/**
 * Default timezone for new accounts
 */
export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/**
 * Initial form state factory
 * @param {string|null} selectedPlan - Pre-selected plan
 * @returns {Object} Initial form data
 */
export function getInitialFormData(selectedPlan = null) {
  return {
    // Common fields
    name: '',
    address: '',
    phoneNumber: '',
    websiteUrl: '',
    ownerEmail: '',
    ownerName: '',
    // Restaurant-specific
    cuisineType: '',
    description: '',
    // Voice-specific
    businessType: '',
    // Real Estate-specific
    brandName: '',
    brokerage: '',
    licenseNumber: '',
    markets: '',
    // Plan
    selectedPlan,
    // Account auth mode
    authMethod: 'password',
  };
}

/**
 * Validate form data based on tenant type
 * @param {Object} formData - Form data
 * @param {string} tenantType - Tenant type
 * @returns {boolean} Whether form is valid
 */
export function isFormValid(formData, tenantType) {
  // Base required fields
  const baseValid = 
    formData.name.trim().length > 0 &&
    formData.address.trim().length > 0 &&
    formData.ownerEmail.trim().length > 0;

  if (!baseValid) return false;

  // Tenant-specific validation
  switch (tenantType) {
    case 'real_estate':
      // Email is checked in base, no additional required fields
      return true;
    case 'voice':
      return (
        formData.ownerName.trim().length > 0 &&
        formData.businessType.trim().length > 0
      );
    case 'restaurant':
    default:
      return (
        formData.ownerName.trim().length > 0 &&
        formData.cuisineType.trim().length > 0 &&
        formData.description.trim().length > 0
      );
  }
}

/**
 * Parse markets string into array
 * @param {string} markets - Comma or newline separated markets
 * @returns {string[]} Array of market strings
 */
export function parseMarkets(markets) {
  return markets
    .split(/[,\n]/)
    .map(m => m.trim())
    .filter(m => m.length > 0);
}

/**
 * Send password reset email via Firebase Auth
 * @param {string} email - User email
 * @param {string} redirectUrl - URL to redirect after password reset
 * @returns {Promise<boolean>} Whether email was sent
 */
export async function sendFirebasePasswordReset(email, redirectUrl) {
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    const { auth } = await import('../../firebase/config');
    await sendPasswordResetEmail(auth, email, {
      url: redirectUrl,
      handleCodeInApp: false,
    });
    return true;
  } catch (error) {
    console.error('Firebase Auth email failed:', error);
    return false;
  }
}

/**
 * Handle onboarding error
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function getOnboardingErrorMessage(error) {
  const message = 
    error?.response?.data?.error || 
    error?.message || 
    'Failed to create account. Please try again.';

  // Enhance error message for user-related issues
  if (message.includes('user') || message.includes('email')) {
    return `${message} Please verify your email address is correct and try again, or contact support.`;
  }

  return message;
}

/**
 * Get tenant-specific labels
 * @param {string} tenantType - Tenant type
 * @returns {Object} Labels for form fields
 */
export function getTenantLabels(tenantType) {
  switch (tenantType) {
    case 'real_estate':
      return {
        title: 'Merxus Real Estate',
        nameLabel: 'Agent Name',
        namePlaceholder: 'Enter your name (e.g., Jake Smith)',
        nameHelp: 'This will be used as your professional name (e.g., "The Jake Smith Team")',
        addressLabel: 'Office Address',
        addressPlaceholder: 'Enter your office address',
        websitePlaceholder: 'https://yourrealestate.com',
        successMessage: 'Agent account created successfully! Please check your email to set your password.',
      };
    case 'voice':
      return {
        title: 'Merxus Voice',
        nameLabel: 'Business Name',
        namePlaceholder: 'Enter your business name',
        nameHelp: null,
        addressLabel: 'Address',
        addressPlaceholder: 'Enter your business address',
        websitePlaceholder: 'https://yourbusiness.com',
        successMessage: 'Office created successfully! Please check your email to set your password.',
      };
    case 'restaurant':
    default:
      return {
        title: 'Merxus',
        nameLabel: 'Restaurant Name',
        namePlaceholder: 'Enter your restaurant name',
        nameHelp: null,
        addressLabel: 'Address',
        addressPlaceholder: 'Enter your restaurant address',
        websitePlaceholder: 'https://yourrestaurant.com',
        successMessage: 'Restaurant created successfully! Please check your email to set your password.',
      };
  }
}
