import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import apiClient from '../api/client';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { queueFirstLoginChecklist } from '../utils/firstLoginChecklist';

const ONBOARDING_TENANT_TYPE_KEY = 'merxus_onboarding_selected_type';
const ONBOARDING_PENDING_PREFILL_KEY = 'merxus_onboarding_pending_prefill';
const WIZARD_STORAGE_KEY = 'merxus_onboarding_wizard';
const WIZARD_TOTAL_STEPS = 8;

function hasActiveWizardSession() {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    const currentStep = Number(parsed?.currentStep || 0);
    return currentStep > 0 && currentStep < WIZARD_TOTAL_STEPS;
  } catch {
    return false;
  }
}

function buildTenantCreatedFromQuery(tenantType, tenantId) {
  if (!tenantType || !tenantId) return null;

  const base = {
    tenantType,
    tenantId,
  };

  if (tenantType === 'voice') {
    return { ...base, officeId: tenantId };
  }

  if (tenantType === 'restaurant') {
    return { ...base, restaurantId: tenantId };
  }

  if (tenantType === 'real_estate') {
    return { ...base, agentId: tenantId };
  }

  return base;
}

function resolveTenantIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.officeId || payload.restaurantId || payload.agentId || payload.tenantId || null;
}

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userClaims, loading, needsOnboarding, signOut, refreshToken } = useAuth();
  const [showWizard, setShowWizard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantCreated, setTenantCreated] = useState(null);
  const [prefillDraft, setPrefillDraft] = useState(null);

  const queueChecklistPrompt = (tenantType, tenantId) => {
    if (!user?.uid || !tenantType) return;
    queueFirstLoginChecklist({
      userId: user.uid,
      tenantType,
      tenantId: tenantId || null,
    });
  };

  const initialTenantType =
    searchParams.get('type') ||
    sessionStorage.getItem(ONBOARDING_TENANT_TYPE_KEY) ||
    null;
  const tenantIdFromQuery = searchParams.get('tenantId') || null;
  const sessionIdFromQuery = searchParams.get('session_id') || null;
  const resumeStep = Number(searchParams.get('resumeStep') || 0);
  const isPaymentReturn = searchParams.get('success') === 'true';
  const isCanceledReturn = searchParams.get('canceled') === 'true';
  const hasWizardProgress = hasActiveWizardSession();
  const effectiveResumeStep = isPaymentReturn ? Math.max(6, resumeStep || 0) : resumeStep;
  const shouldResumeTwilio = isPaymentReturn && effectiveResumeStep >= 6;
  const authMethod =
    user?.providerData?.some((p) => p?.providerId === 'apple.com') ? 'apple' : 'password';

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ONBOARDING_PENDING_PREFILL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed) {
        setPrefillDraft(parsed);
      }
      sessionStorage.removeItem(ONBOARDING_PENDING_PREFILL_KEY);
    } catch (err) {
      console.warn('Failed to restore onboarding prefill draft', err);
    }
  }, []);

  useEffect(() => {
    if (!isPaymentReturn && !isCanceledReturn) return;

    const cleanedParams = new URLSearchParams(searchParams);
    cleanedParams.delete('success');
    cleanedParams.delete('canceled');
    cleanedParams.delete('session_id');
    cleanedParams.delete('resumeStep');
    const cleanQuery = cleanedParams.toString();
    const cleanUrl = cleanQuery ? `${window.location.pathname}?${cleanQuery}` : window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }, [isPaymentReturn, isCanceledReturn, searchParams]);

  useEffect(() => {
    if (!tenantIdFromQuery || !initialTenantType) return;
    if (tenantCreated) return;

    const hydratedTenant = buildTenantCreatedFromQuery(initialTenantType, tenantIdFromQuery);
    if (hydratedTenant) {
      setTenantCreated(hydratedTenant);
    }
  }, [tenantCreated, initialTenantType, tenantIdFromQuery]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Allow users to continue wizard after payment return or while an in-progress wizard exists,
    // even if claims are already present from pre-save onboarding.
    if (userClaims && !needsOnboarding && !isPaymentReturn && !isCanceledReturn && !hasWizardProgress) {
      const dashboardPaths = {
        restaurant: '/restaurant',
        voice: '/voice',
        real_estate: '/estate',
        merxus: '/merxus',
      };
      navigate(dashboardPaths[userClaims.type] || '/', { replace: true });
    }
  }, [loading, user, userClaims, needsOnboarding, isPaymentReturn, isCanceledReturn, hasWizardProgress, navigate]);

  const handleComplete = async (wizardData, isPreSave = false) => {
    if (tenantCreated && !isPreSave) {
      const resolvedTenantId = resolveTenantIdFromPayload(tenantCreated) || resolveTenantIdFromPayload(wizardData);
      queueChecklistPrompt(wizardData.tenantType, resolvedTenantId);

      const dashboardPaths = {
        restaurant: '/restaurant/dashboard',
        voice: '/voice/dashboard',
        real_estate: '/estate/dashboard',
      };
      navigate(dashboardPaths[wizardData.tenantType] || '/', { replace: true });
      return tenantCreated;
    }

    if (tenantCreated && isPreSave) {
      return tenantCreated;
    }

    if (isSubmitting) return tenantCreated || null;
    setIsSubmitting(true);

    try {
      const effectiveEmail = user?.email || wizardData.email;
      const isAppleAuth = authMethod === 'apple';
      const authPayload = isAppleAuth
        ? { authMethod: 'apple', firebaseUid: user?.uid }
        : { authMethod: 'password', password: wizardData.tempPassword, firebaseUid: user?.uid };

      let endpoint = '';
      let payload = {};

      switch (wizardData.tenantType) {
        case 'restaurant':
          endpoint = '/onboarding/restaurant';
          payload = {
            restaurant: {
              name: wizardData.businessName,
              email: effectiveEmail,
              address: wizardData.address,
              city: wizardData.city ?? '',
              state: wizardData.state ?? '',
              zip: wizardData.zip ?? '',
              phoneNumber: wizardData.phone,
              twilioPhoneNumber: wizardData.twilioPhoneNumber,
              twilioPhoneSid: wizardData.twilioPhoneSid,
              twilioAccountSid: wizardData.twilioAccountSid,
              twilioAuthToken: wizardData.twilioAuthToken,
              aiVoice: wizardData.aiVoice || 'alloy',
              cuisineType: wizardData.industryData?.cuisineType,
              description: wizardData.industryData?.description,
              dineIn: wizardData.industryData?.dineIn === 'yes',
              delivery: wizardData.industryData?.delivery === 'yes',
            },
            manager: {
              displayName: wizardData.ownerName,
              email: effectiveEmail,
              ...authPayload,
            },
          };
          break;
        case 'voice':
        case 'general':
          endpoint = '/onboarding/office';
          payload = {
            office: {
              name: wizardData.businessName,
              email: effectiveEmail,
              address: wizardData.address,
              city: wizardData.city ?? '',
              state: wizardData.state ?? '',
              zip: wizardData.zip ?? '',
              phoneNumber: wizardData.phone,
              twilioPhoneNumber: wizardData.twilioPhoneNumber,
              twilioPhoneSid: wizardData.twilioPhoneSid,
              twilioAccountSid: wizardData.twilioAccountSid,
              twilioAuthToken: wizardData.twilioAuthToken,
              aiVoice: wizardData.aiVoice || 'alloy',
              businessType: wizardData.industryData?.businessType,
              description: wizardData.industryData?.description,
            },
            owner: {
              displayName: wizardData.ownerName,
              email: effectiveEmail,
              ...authPayload,
            },
          };
          break;
        case 'real_estate':
          endpoint = '/onboarding/agent';
          payload = {
            agent: {
              name: wizardData.ownerName,
              agentName: wizardData.industryData?.brandName || wizardData.ownerName,
              email: effectiveEmail,
              phone: wizardData.phone,
              address: wizardData.address,
              city: wizardData.city ?? '',
              state: wizardData.state ?? '',
              zip: wizardData.zip ?? '',
              twilioPhoneNumber: wizardData.twilioPhoneNumber,
              twilioPhoneSid: wizardData.twilioPhoneSid,
              twilioAccountSid: wizardData.twilioAccountSid,
              twilioAuthToken: wizardData.twilioAuthToken,
              aiVoice: wizardData.aiVoice || 'alloy',
              brokerage: wizardData.industryData?.brokerage,
              licenseNumber: wizardData.industryData?.licenseNumber,
              markets: wizardData.industryData?.markets,
            },
            owner: {
              displayName: wizardData.ownerName,
              email: effectiveEmail,
              ...authPayload,
            },
          };
          break;
        default:
          throw new Error('Please select a tenant type to continue.');
      }

      const response = await apiClient.post(endpoint, payload);
      const createdTenant = { ...response.data, tenantType: wizardData.tenantType };
      setTenantCreated(createdTenant);
      const resolvedTenantId = resolveTenantIdFromPayload(createdTenant) || resolveTenantIdFromPayload(wizardData);
      queueChecklistPrompt(wizardData.tenantType, resolvedTenantId);

      if (isPreSave) {
        toast.success('✅ Setup saved! You can now test your AI at the next step.', { autoClose: 3000 });
        setIsSubmitting(false);
        return createdTenant;
      }

      toast.success('🎉 Setup completed! Refreshing your access...');

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true);
          await refreshToken();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
      }

      const dashboardPaths = {
        restaurant: '/restaurant/dashboard',
        voice: '/voice/dashboard',
        real_estate: '/estate/dashboard',
      };

      setTimeout(() => {
        setShowWizard(false);
        navigate(dashboardPaths[wizardData.tenantType] || '/', { replace: true });
      }, 500);
      return createdTenant;
    } catch (error) {
      console.error('Error completing setup:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to complete setup';
      toast.error(`Setup failed: ${errorMessage}`);
      setIsSubmitting(false);
      throw error;
    }
  };

  const handleClose = async () => {
    setShowWizard(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!showWizard) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  const resolvedTenantType = initialTenantType || prefillDraft?.tenantType || null;
  const prefillForm = prefillDraft?.formData || {};

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <OnboardingWizard
        onClose={handleClose}
        onComplete={handleComplete}
        onSwitchToOwner={() => {}}
        tenantType={resolvedTenantType}
        authMethod={authMethod}
        prefillEmail={prefillForm.ownerEmail || user?.email}
        prefillName={prefillForm.ownerName || user?.displayName}
        prefillBusinessName={prefillForm.name}
        prefillPhone={prefillForm.phoneNumber}
        prefillAddress={prefillForm.address}
        prefillBusinessType={prefillForm.businessType}
        prefillCuisineType={prefillForm.cuisineType}
        prefillDescription={prefillForm.description}
        tenantCreated={tenantCreated}
        resumeStep={shouldResumeTwilio ? effectiveResumeStep : null}
        forcePaymentComplete={isPaymentReturn}
        paymentSessionId={sessionIdFromQuery}
        resumeTenantId={tenantIdFromQuery}
      />
    </div>
  );
}
