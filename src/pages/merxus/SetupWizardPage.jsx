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
import { getAdminSetupCompletionPath } from '../../utils/adminSetupRouting';
import { buildOnboardingPayload } from '../../utils/onboardingPayload';

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantCreated, setTenantCreated] = useState(null); // Store created tenant info

  const handleComplete = async (wizardData, isPreSave = false) => {
    console.log('Wizard completion called:', { isPreSave, tenantAlreadyCreated: !!tenantCreated, wizardData });
    
    // Demo tenants are created before phone assignment. The administrator's
    // Firebase claims intentionally remain Merxus-admin claims, so completing
    // the wizard must return to the admin portal rather than a tenant-only
    // dashboard. Entering the tenant is an explicit owner sign-in action.
    if (tenantCreated && !isPreSave) {
      console.log('✅ Tenant already created, returning to Tenant Management...');
      toast.success('🎉 Demo tenant created! Returning to Tenant Management...');
      
      setTimeout(() => {
        setShowWizard(false);
        navigate(getAdminSetupCompletionPath(), { replace: true });
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
      
      let endpoint = '';
      switch (wizardData.tenantType) {
        case 'restaurant':
          endpoint = '/admin/demo-tenants/restaurant';
          break;
        case 'voice':
        case 'general':
          endpoint = '/admin/demo-tenants/office';
          break;
        case 'real_estate':
          endpoint = '/admin/demo-tenants/real-estate';
          break;
        default:
          throw new Error(`Unsupported tenant type: ${wizardData.tenantType}`);
      }

      const payload = {
        ...buildOnboardingPayload(wizardData, {
          authPayload: {
            password: wizardData.tempPassword,
            allowExistingUser: true,
          },
        }),
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
        // The current user is a Merxus administrator. Provisioning creates
        // tenant claims for the owner, not for the administrator.
        toast.success('🎉 Demo tenant created! Returning to Tenant Management...');
        void trackWorksideAnalyticsEvent('onboarding_completed', {
          tenantId: resolvedTenantId,
          tenantType: wizardData.tenantType,
        }, { sessionId: resolvedTenantId });
        
        setTimeout(() => {
          setShowWizard(false);
          navigate(getAdminSetupCompletionPath(), { replace: true });
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
