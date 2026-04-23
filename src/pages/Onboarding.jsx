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
import { OAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import InvitationLinkModal from '../components/common/InvitationLinkModal';
import TenantSelector from '../components/TenantSelector';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  getPricingInfo,
  getInitialFormData,
  isFormValid,
  getTenantLabels,
} from '../components/onboarding';
import { submitOnboarding } from '../components/onboarding/onboardingApi';
import { getEmailSignInMethods, getSignInMethodInfo } from '../utils/authProviders';
import { capitalizeWordsPreservingApostrophes } from '../utils/textFormatters';
import { sendVerificationEmail } from '../api/otp';
import {
  AccountMethodSelector,
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

const APPLE_ONBOARDING_FLOW_KEY = 'merxus_onboarding_auth_flow';
const APPLE_ONBOARDING_DRAFT_KEY = 'merxus_onboarding_apple_draft';
const ONBOARDING_TENANT_TYPE_KEY = 'merxus_onboarding_selected_type';
const ONBOARDING_PENDING_PREFILL_KEY = 'merxus_onboarding_pending_prefill';

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAppleUser, needsOnboarding } = useAuth();
  
  // URL parameters
  const tenantTypeParam = searchParams.get('type');
  const allowedTenantTypes = new Set(['restaurant', 'voice', 'real_estate']);
  const hasExplicitTenantType = allowedTenantTypes.has(tenantTypeParam);
  const tenantType = hasExplicitTenantType ? tenantTypeParam : 'restaurant';
  const selectedPlan = searchParams.get('plan') || (tenantType === 'voice' ? 'basic' : null);
  const returnTo = searchParams.get('returnTo') || null;
  const source = searchParams.get('source') || null;
  const prefillEmailFromQuery = (searchParams.get('email') || '').trim();
  
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
  const isAppleAuth = formData.authMethod === 'apple';
  const isAppleConnected = Boolean(isAppleAuth && user?.uid && isAppleUser && user?.email);
  const forceAppleAuth = Boolean(user?.uid && isAppleUser && needsOnboarding);

  // Scroll to top on mount or tenant type change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tenantType]);

  useEffect(() => {
    if (tenantType) {
      sessionStorage.setItem(ONBOARDING_TENANT_TYPE_KEY, tenantType);
    }
  }, [tenantType]);

  useEffect(() => {
    if (formData.selectedPlan === selectedPlan) return;
    setFormData((prev) => ({
      ...prev,
      selectedPlan,
    }));
  }, [formData.selectedPlan, selectedPlan]);

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(APPLE_ONBOARDING_DRAFT_KEY);
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft);
      if (parsed?.tenantType !== tenantType) return;
      const draftData = parsed?.formData || {};
      setFormData((prev) => ({
        ...prev,
        ...draftData,
        selectedPlan,
      }));
    } catch (error) {
      console.warn('Failed to restore onboarding draft:', error);
    } finally {
      sessionStorage.removeItem(APPLE_ONBOARDING_DRAFT_KEY);
    }
  }, [selectedPlan, tenantType]);

  useEffect(() => {
    let raw = sessionStorage.getItem(ONBOARDING_PENDING_PREFILL_KEY);
    if (!raw) {
      raw = localStorage.getItem(ONBOARDING_PENDING_PREFILL_KEY);
    }
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.tenantType !== tenantType) return;

      const draftData = parsed?.formData || {};
      setFormData((prev) => {
        const isStillInitial =
          !prev.name &&
          !prev.ownerEmail &&
          !prev.phoneNumber &&
          !prev.address;

        if (!isStillInitial) {
          return prev;
        }

        return {
          ...prev,
          ...draftData,
          selectedPlan,
        };
      });
    } catch (error) {
      console.warn('Failed to restore pending onboarding prefill:', error);
    }
  }, [selectedPlan, tenantType]);

  useEffect(() => {
    if (!prefillEmailFromQuery) return;
    setFormData((prev) => {
      if (prev.ownerEmail && prev.ownerEmail.trim().length > 0) return prev;
      return {
        ...prev,
        ownerEmail: prefillEmailFromQuery,
      };
    });
  }, [prefillEmailFromQuery]);

  useEffect(() => {
    if (!isAppleConnected) return;
    setFormData((prev) => {
      if (prev.ownerEmail === user.email && prev.authMethod === 'apple') return prev;
      return {
        ...prev,
        authMethod: 'apple',
        ownerEmail: user.email,
      };
    });
  }, [isAppleConnected, user?.email]);

  useEffect(() => {
    if (!isAppleAuth) return;

    let isMounted = true;
    const checkAppleRedirectResult = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        if (!isMounted) return;
        console.error('Apple redirect error:', error);
        setError('Apple Sign-In failed. Please try again.');
        toast.error('Apple Sign-In failed. Please try again.');
      }
    };

    checkAppleRedirectResult();
    return () => {
      isMounted = false;
    };
  }, [isAppleAuth]);

  // Form handlers
  const formatPhoneNumber = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'phoneNumber'
        ? formatPhoneNumber(value)
        : name === 'address' || name === 'name'
          ? capitalizeWordsPreservingApostrophes(value)
          : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleAuthMethodChange = (nextMethod) => {
    if (nextMethod !== 'apple' && nextMethod !== 'password') return;
    if ((forceAppleAuth || isAppleConnected) && nextMethod !== 'apple') return;

    if (nextMethod === 'password') {
      sessionStorage.removeItem(APPLE_ONBOARDING_FLOW_KEY);
    } else {
      sessionStorage.setItem(APPLE_ONBOARDING_FLOW_KEY, 'apple');
    }

    setFormData((prev) => ({
      ...prev,
      authMethod: nextMethod,
      ownerEmail:
        nextMethod === 'apple' && user?.email
          ? user.email
          : prev.ownerEmail,
    }));
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setProviderHint(null);
    setLoading(true);

    try {
      sessionStorage.setItem(APPLE_ONBOARDING_FLOW_KEY, 'apple');
      sessionStorage.setItem(
        APPLE_ONBOARDING_DRAFT_KEY,
        JSON.stringify({
          tenantType,
          formData,
        })
      );

      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error('Apple Sign-In error:', err);
      setError('Apple Sign-In failed. Please try again.');
      toast.error('Apple Sign-In failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setProviderHint(null);
    setLoading(true);

    try {
      if (isAppleAuth) {
        if (!isAppleConnected) {
          const message = 'Please connect Apple Sign-In before creating your account.';
          setError(message);
          toast.error(message);
          setLoading(false);
          return;
        }

        const wizardParams = new URLSearchParams();
        if (tenantType) wizardParams.set('type', tenantType);
        if (returnTo) wizardParams.set('returnTo', returnTo);
        navigate(`/onboarding-wizard?${wizardParams.toString()}`, { replace: true });
        setLoading(false);
        return;
      }

      if (!isAppleAuth) {
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
      }

      const submitData = {
        ...formData,
        ownerEmail: isAppleConnected ? user.email : formData.ownerEmail,
      };

      if (submitData.authMethod === 'password') {
        const prefillPayload = {
          tenantType,
          formData: {
            ...submitData,
          },
          createdAt: Date.now(),
        };
        sessionStorage.setItem(ONBOARDING_PENDING_PREFILL_KEY, JSON.stringify(prefillPayload));
        try {
          localStorage.setItem(ONBOARDING_PENDING_PREFILL_KEY, JSON.stringify(prefillPayload));
        } catch (_) {}

        const otpParams = new URLSearchParams({
          type: tenantType,
          email: submitData.ownerEmail,
        });
        if (selectedPlan) otpParams.set('plan', selectedPlan);
        if (returnTo) otpParams.set('returnTo', returnTo);

        let otpResponse;
        try {
          otpResponse = await sendVerificationEmail({ email: submitData.ownerEmail });
        } catch (otpError) {
          const retryAfterSeconds = otpError?.response?.data?.retryAfterSeconds;
          if (otpError?.response?.status === 429) {
            toast('A verification code was already sent. Use that code below or resend after the short wait.');
            if (retryAfterSeconds) {
              console.info(`OTP resend available in ${retryAfterSeconds} seconds.`);
            }
            navigate(`/onboarding/verify-otp?${otpParams.toString()}`);
            return;
          }
          throw otpError;
        }

        if (otpResponse?.otpCode) otpParams.set('otp', otpResponse.otpCode);

        navigate(`/onboarding/verify-otp?${otpParams.toString()}`);
      } else {
        const result = await submitOnboarding(tenantType, submitData, {
          returnToPath: returnTo,
          authMethod: submitData.authMethod,
          firebaseUid: isAppleConnected ? user.uid : null,
        });

        if (result.emailSent) {
          const loginPath = returnTo
            ? `/login?type=${encodeURIComponent(tenantType)}&returnTo=${encodeURIComponent(returnTo)}`
            : '/login';
          navigate(loginPath, {
            state: {
              message: labels.successMessage,
              email: formData.ownerEmail,
              returnTo,
              tenantType,
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
    const loginPath = returnTo
      ? `/login?type=${encodeURIComponent(tenantType)}&returnTo=${encodeURIComponent(returnTo)}`
      : '/login';
    navigate(loginPath, {
      state: {
        message: 'Account created successfully! Please use the password setup link to complete your registration.',
        email: invitationData?.email,
        returnTo,
        tenantType,
      },
    });
  };

  if (!hasExplicitTenantType) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary-50 to-white px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-slate-100">
              Get Started with Merxus
            </h1>
            <p className="mb-2 text-xl text-gray-700 dark:text-slate-300">
              First, choose your tenant type.
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              You&apos;ll continue with the right onboarding wizard for your business.
            </p>
          </div>
        </div>
        <TenantSelector
          queryParams={{
            plan: selectedPlan,
            returnTo,
            source,
            email: prefillEmailFromQuery,
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary-50 to-white px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-slate-100">
            Get Started with {labels.title}
          </h1>
          <p className="mb-4 text-xl text-gray-700 dark:text-slate-300">
            Fill out your {isRealEstate ? 'agent' : isVoice ? 'business' : 'restaurant'} information to begin
          </p>
          
          <PlanDisplay pricingInfo={pricingInfo} selectedPlan={selectedPlan} />
          
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              <span className="font-semibold text-primary-600">30-day free trial</span> • Setup fee charged upfront
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-6">
          <AccountMethodSelector
            authMethod={formData.authMethod}
            onChange={handleAuthMethodChange}
            isAppleConnected={isAppleConnected}
            appleEmail={user?.email || ''}
            onAppleConnect={handleAppleSignIn}
            loading={loading}
            disableEmailOption={forceAppleAuth || isAppleConnected}
          />

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
              helpText={
                isAppleAuth
                  ? (isAppleConnected
                    ? 'Using your Apple Sign-In email for this account.'
                    : 'Connect Apple Sign-In above to continue.')
                  : "We'll send a password setup link to this email"
              }
              readOnly={isAppleAuth && isAppleConnected}
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
            helpText="Enter full address: street, city, state, and ZIP."
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
            emailReadOnly={isAppleAuth && isAppleConnected}
            introText={
              isAppleAuth
                ? (isAppleConnected
                  ? 'Your Apple Sign-In account will be used for this owner profile.'
                  : 'Connect Apple Sign-In above before you create this account.')
                : "We'll send an invitation email to set up your account password."
            }
            emailHelpText={
              isAppleAuth
                ? (isAppleConnected
                  ? 'Using your Apple Sign-In email for account access.'
                  : 'Connect Apple Sign-In above to continue.')
                : "We'll send a password setup link to this email"
            }
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
            disabled={!isFormValid(formData, tenantType) || (isAppleAuth && !isAppleConnected)}
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
