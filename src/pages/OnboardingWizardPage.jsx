import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import apiClient from '../api/client';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userClaims, loading, needsOnboarding, isAppleUser, signOut, refreshToken } = useAuth();
  const [showWizard, setShowWizard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantCreated, setTenantCreated] = useState(null);

  const initialTenantType = searchParams.get('type') || null;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isAppleUser) {
      navigate('/onboarding', { replace: true });
      return;
    }

    if (userClaims && !needsOnboarding) {
      const dashboardPaths = {
        restaurant: '/restaurant',
        voice: '/voice',
        real_estate: '/estate',
        merxus: '/merxus',
      };
      navigate(dashboardPaths[userClaims.type] || '/', { replace: true });
    }
  }, [loading, user, userClaims, needsOnboarding, isAppleUser, navigate]);

  const handleComplete = async (wizardData, isPreSave = false) => {
    if (tenantCreated && !isPreSave) {
      const dashboardPaths = {
        restaurant: '/restaurant/dashboard',
        voice: '/voice/dashboard',
        real_estate: '/estate/dashboard',
      };
      navigate(dashboardPaths[wizardData.tenantType] || '/', { replace: true });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const effectiveEmail = user?.email || wizardData.email;
      const authPayload = {
        authMethod: 'apple',
        firebaseUid: user?.uid,
      };

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
              city: wizardData.city,
              state: wizardData.state,
              zip: wizardData.zip,
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
              city: wizardData.city,
              state: wizardData.state,
              zip: wizardData.zip,
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
              city: wizardData.city,
              state: wizardData.state,
              zip: wizardData.zip,
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
      setTenantCreated({ ...response.data, tenantType: wizardData.tenantType });

      if (isPreSave) {
        toast.success('✅ Setup saved! You can now test your AI at the next step.', { autoClose: 3000 });
        setIsSubmitting(false);
        return;
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <OnboardingWizard
        onClose={handleClose}
        onComplete={handleComplete}
        onSwitchToOwner={() => {}}
        tenantType={initialTenantType}
        authMethod="apple"
        prefillEmail={user?.email}
        prefillName={user?.displayName}
        tenantCreated={tenantCreated}
      />
    </div>
  );
}
