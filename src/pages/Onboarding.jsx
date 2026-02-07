/**
 * Onboarding Page - Refactored version using extracted components
 * 
 * This page handles onboarding for all tenant types:
 * - Restaurant
 * - Voice/Office
 * - Real Estate/Agent
 * 
 * Components used:
 * - OnboardingFormFields: Reusable form field components
 * - onboardingUtils: Pricing, validation, labels
 * - onboardingApi: API submission handlers
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import InvitationLinkModal from '../components/common/InvitationLinkModal';
import {
  getPricingInfo,
  getInitialFormData,
  isFormValid,
  getTenantLabels,
} from '../components/onboarding';
import { submitOnboarding } from '../components/onboarding/onboardingApi';
import { getEmailSignInMethods, getSignInMethodInfo } from '../utils/authProviders';
import {
  FormInput,
  FormTextarea,
  PlanDisplay,
  OwnerInfoSection,
  RestaurantFields,
  VoiceFields,
  RealEstateFields,
  FormError,
  SubmitButton,
} from '../components/onboarding/OnboardingFormFields';

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // URL parameters
  const tenantType = searchParams.get('type') || 'restaurant';
  const selectedPlan = searchParams.get('plan') || null;
  
  // Derived state
  const isVoice = tenantType === 'voice';
  const isRealEstate = tenantType === 'real_estate';
  const pricingInfo = getPricingInfo(tenantType, selectedPlan);
  const labels = getTenantLabels(tenantType);

  // Form state
  const [formData, setFormData] = useState(() => getInitialFormData(selectedPlan));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [providerHint, setProviderHint] = useState(null);
  
  // Invitation modal state
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationData, setInvitationData] = useState(null);

  // Scroll to top on mount or tenant type change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tenantType]);

  // Form handlers
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setProviderHint(null);
    setLoading(true);

    try {
      const methods = await getEmailSignInMethods(formData.ownerEmail);
      const methodInfo = getSignInMethodInfo(methods);
      if (methodInfo.hasProvider) {
        const message = methodInfo.hasPassword
          ? 'An account with this email already exists. Please sign in instead.'
          : methodInfo.isAppleOnly
            ? 'This email is linked to Apple Sign-In. Please sign in with Apple.'
            : `This email is linked to ${methodInfo.providerLabel}. Please sign in using that provider.`;
        setProviderHint(methodInfo);
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      const result = await submitOnboarding(tenantType, formData);

      if (result.emailSent) {
        navigate('/login', {
          state: {
            message: labels.successMessage,
            email: formData.ownerEmail,
          },
        });
      } else {
        // Email couldn't be sent - show invitation link modal
        setInvitationData({
          link: result.invitationLink,
          email: formData.ownerEmail,
          tenantType: result.tenantType,
        });
        setShowInvitationModal(true);
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationModalClose = () => {
    setShowInvitationModal(false);
    navigate('/login', {
      state: {
        message: 'Account created successfully! Please use the password setup link to complete your registration.',
        email: invitationData?.email,
      },
    });
  };

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-br from-primary-50 to-white min-h-screen">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get Started with {labels.title}
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            Fill out your {isRealEstate ? 'agent' : isVoice ? 'business' : 'restaurant'} information to begin
          </p>
          
          <PlanDisplay pricingInfo={pricingInfo} selectedPlan={selectedPlan} />
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-primary-600">30-day free trial</span> • Setup fee charged upfront
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Name field */}
          <FormInput
            id="name"
            name="name"
            label={labels.nameLabel}
            required
            value={formData.name}
            onChange={handleChange}
            placeholder={labels.namePlaceholder}
            helpText={labels.nameHelp}
          />

          {/* Email field immediately after name for Real Estate */}
          {isRealEstate && (
            <FormInput
              id="ownerEmail"
              name="ownerEmail"
              type="email"
              label="Email Address"
              required
              value={formData.ownerEmail}
              onChange={handleChange}
              placeholder="your.email@example.com"
              helpText="We'll send a password setup link to this email"
            />
          )}

          {/* Address */}
          <FormInput
            id="address"
            name="address"
            label={labels.addressLabel}
            required
            value={formData.address}
            onChange={handleChange}
            placeholder={labels.addressPlaceholder}
          />

          {/* Phone */}
          <FormInput
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            label="Contact Phone Number"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="(555) 123-4567"
            helpText="Optional - Your contact number in case we need to reach you. The phone number for receiving calls will be configured when you set up your Twilio service."
          />

          {/* Website */}
          <FormInput
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            label="Website URL"
            value={formData.websiteUrl}
            onChange={handleChange}
            placeholder={labels.websitePlaceholder}
          />

          {/* Tenant-specific fields */}
          {!isVoice && !isRealEstate && (
            <RestaurantFields formData={formData} onChange={handleChange} />
          )}

          {isVoice && (
            <VoiceFields formData={formData} onChange={handleChange} />
          )}

          {isRealEstate && (
            <RealEstateFields formData={formData} onChange={handleChange} />
          )}

          {/* Owner/Manager section (not for real estate) */}
          <OwnerInfoSection
            formData={formData}
            onChange={handleChange}
            showSection={!isRealEstate}
          />

          {/* Error display */}
          <FormError error={error} />

          {providerHint?.isAppleOnly && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">This email uses Apple Sign-In</p>
              <p className="mt-1">Please sign in with Apple to continue.</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-3 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {/* Submit button */}
          <SubmitButton
            loading={loading}
            disabled={!isFormValid(formData, tenantType)}
            pricingInfo={pricingInfo}
            selectedPlan={selectedPlan}
          />
        </form>
      </div>

      {/* Invitation Link Modal */}
      <InvitationLinkModal
        isOpen={showInvitationModal}
        onClose={handleInvitationModalClose}
        invitationLink={invitationData?.link}
        email={invitationData?.email}
        tenantType={invitationData?.tenantType}
      />
    </div>
  );
};

export default Onboarding;
