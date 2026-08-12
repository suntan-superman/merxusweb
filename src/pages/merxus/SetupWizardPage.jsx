import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { auth } from '../../firebase/config';
import { getEmailSignInMethods, getSignInMethodInfo } from '../../utils/authProviders';
import { trackWorksideAnalyticsEvent } from '../../utils/worksideAnalytics';

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantCreated, setTenantCreated] = useState(null); // Store created tenant info

  const handleComplete = async (wizardData, isPreSave = false) => {
    console.log('Wizard completion called:', { isPreSave, tenantAlreadyCreated: !!tenantCreated, wizardData });
    
    // If tenant already created (at Step 5) and this is Step 7, just redirect
    if (tenantCreated && !isPreSave) {
      console.log('✅ Tenant already created, redirecting to dashboard...');
      toast.success('🎉 Welcome! Redirecting to your dashboard...');
      
      setTimeout(() => {
        setShowWizard(false);
        const dashboardPaths = {
          restaurant: '/restaurant/dashboard',
          voice: '/voice/dashboard',
          real_estate: '/estate/dashboard',
        };
        navigate(dashboardPaths[wizardData.tenantType] || '/merxus');
      }, 1500);
      
      return tenantCreated;
    }

    // If this is a pre-save and tenant was already created, return existing info.
    if (tenantCreated && isPreSave) {
      return tenantCreated;
    }

    if (isSubmitting) return tenantCreated || null; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      if (wizardData?.email) {
        const methods = await getEmailSignInMethods(wizardData.email);
        const methodInfo = getSignInMethodInfo(methods);
        if (methodInfo.hasProvider) {
          const message = methodInfo.hasPassword
            ? 'This email already has an account. Use a different email for setup.'
            : methodInfo.isAppleOnly
              ? 'This email is linked to Apple Sign-In. Use a different email for admin setup.'
              : `This email is linked to ${methodInfo.providerLabel}. Use a different email for admin setup.`;
          toast.error(message);
          setIsSubmitting(false);
          throw new Error(message);
        }
      }
      
      // Determine which API endpoint to call based on tenant type
      let endpoint = '';
      let payload = {};
      
      switch (wizardData.tenantType) {
        case 'restaurant':
          endpoint = '/admin/demo-tenants/restaurant';
          payload = {
            restaurant: {
              name: wizardData.businessName,
              email: wizardData.email, // Required by backend validation
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
              email: wizardData.email,
              password: wizardData.tempPassword,
              allowExistingUser: true,
            },
          };
          break;
          
        case 'voice':
        case 'general':
          endpoint = '/admin/demo-tenants/office';
          payload = {
            office: {
              name: wizardData.businessName,
              email: wizardData.email, // Required by backend validation
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
              email: wizardData.email,
              password: wizardData.tempPassword,
              allowExistingUser: true,
            },
          };
          break;
          
        case 'real_estate':
          endpoint = '/admin/demo-tenants/real-estate';
          
          console.log('🎤 [SetupWizardPage] BEFORE creating payload:');
          console.log('  wizardData.aiVoice:', wizardData.aiVoice);
          
          payload = {
            agent: {
              name: wizardData.ownerName,
              agentName: wizardData.industryData?.brandName || wizardData.ownerName,
              email: wizardData.email,
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
              email: wizardData.email,
              password: wizardData.tempPassword,
              allowExistingUser: true,
            },
          };
          
          console.log('🎤 [SetupWizardPage] AFTER creating payload:');
          console.log('  payload.agent.aiVoice:', payload.agent.aiVoice);
          break;
          
        default:
          throw new Error(`Unsupported tenant type: ${wizardData.tenantType}`);
      }

      payload = {
        ...payload,
        provisioningMode: 'demo',
        demo: {
          planTier: wizardData.demoPlanTier,
          expiresInDays: Number(wizardData.demoExpiresInDays),
          reason: wizardData.demoReason,
        },
      };
      
      console.log('Creating tenant via API:', endpoint, payload);
      
      // Call the onboarding API
      const response = await apiClient.post(endpoint, payload);
      
      console.log('Tenant created successfully:', response.data);
      
      // Store tenant info to prevent duplicate creation
      const createdTenant = { ...response.data, tenantType: wizardData.tenantType };
      setTenantCreated(createdTenant);
      const resolvedTenantId = createdTenant.tenantId || createdTenant.id || wizardData.tenantId || null;
      void trackWorksideAnalyticsEvent('tenant_created', {
        tenantId: resolvedTenantId,
        tenantType: wizardData.tenantType,
        source: isPreSave ? 'setup_wizard_presave' : 'setup_wizard_complete',
      }, { sessionId: resolvedTenantId });
      
      if (isPreSave) {
        // Pre-save at Step 5 (before test) - don't redirect yet
        toast.success('✅ Setup saved! You can now test your AI at the next step.', { autoClose: 3000 });
        setIsSubmitting(false);
        return createdTenant;
      } else {
        // Final completion at Step 7 - refresh auth claims then redirect
        toast.success('🎉 Setup completed! Refreshing your access...');
        void trackWorksideAnalyticsEvent('onboarding_completed', {
          tenantId: resolvedTenantId,
          tenantType: wizardData.tenantType,
        }, { sessionId: resolvedTenantId });
        
        // Force token refresh to get new claims
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            await currentUser.getIdToken(true); // Force refresh
            console.log('✅ Token refreshed, claims should be updated');
            
            // Wait a moment for claims to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
        }
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
          setShowWizard(false);
          
          const dashboardPaths = {
            restaurant: '/restaurant/dashboard',
            voice: '/voice/dashboard',
            real_estate: '/estate/dashboard',
          };
          
          navigate(dashboardPaths[wizardData.tenantType] || '/merxus');
        }, 500);
      }
      
      return createdTenant;
    } catch (error) {
      console.error('Error completing setup:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to complete setup';
      toast.error(`Setup failed: ${errorMessage}`);
      setIsSubmitting(false);
      throw error;
    }
  };

  const handleSwitchToOwner = async (ownerEmail, ownerPassword) => {
    try {
      toast.info('Switching to owner account...');
      
      // Sign out current user (super_admin)
      await signOut(auth);
      console.log('✅ Super admin signed out');
      
      // Wait a moment for auth state to clear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sign in as the new owner
      await signInWithEmailAndPassword(auth, ownerEmail, ownerPassword);
      console.log('✅ Signed in as owner:', ownerEmail);
      
      // Wait for auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('🎉 Welcome! Redirecting to your dashboard...');
      
      // Close wizard and redirect
      setShowWizard(false);
      
      // Redirect based on tenant type (stored in tenantCreated)
      const tenantType = tenantCreated?.tenantType || 'real_estate';
      const dashboardPaths = {
        restaurant: '/restaurant/dashboard',
        voice: '/voice/dashboard',
        real_estate: '/estate/dashboard',
      };
      
      setTimeout(() => {
        navigate(dashboardPaths[tenantType] || '/estate/dashboard');
      }, 500);
      
    } catch (error) {
      console.error('Failed to switch to owner:', error);
      toast.error(`Failed to sign in: ${error.message}`);
    }
  };

  const handleClose = () => {
    setShowWizard(false);
    navigate('/merxus');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {!showWizard ? (
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      ) : (
        <OnboardingWizard
          onClose={handleClose}
          onComplete={handleComplete}
          onSwitchToOwner={handleSwitchToOwner}
          tenantType={null}
          tenantCreated={tenantCreated}
          skipPayment={true}
          demoProvisioning={true}
          selectedPlan="elite"
          disableLocalRestore={true}
        />
      )}
    </div>
  );
}
