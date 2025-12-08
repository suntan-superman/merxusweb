import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async (wizardData) => {
    console.log('Wizard completed with data:', wizardData);
    
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      
      // Determine which API endpoint to call based on tenant type
      let endpoint = '';
      let payload = {};
      
      switch (wizardData.tenantType) {
        case 'restaurant':
          endpoint = '/onboarding/restaurant';
          payload = {
            restaurant: {
              name: wizardData.businessName,
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
            owner: {
              displayName: wizardData.ownerName,
              email: wizardData.email,
            },
          };
          break;
          
        case 'voice':
          endpoint = '/onboarding/office';
          payload = {
            office: {
              name: wizardData.businessName,
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
              email: wizardData.email,
            },
          };
          break;
          
        case 'real_estate':
          endpoint = '/onboarding/agent';
          payload = {
            agent: {
              name: wizardData.ownerName,
              agentName: wizardData.industryData?.brandName || wizardData.ownerName,
              email: wizardData.email,
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
              email: wizardData.email,
            },
          };
          break;
          
        default:
          throw new Error(`Unsupported tenant type: ${wizardData.tenantType}`);
      }
      
      console.log('Creating tenant via API:', endpoint, payload);
      
      // Call the onboarding API
      const response = await apiClient.post(endpoint, payload);
      
      console.log('Tenant created successfully:', response.data);
      
      toast.success('🎉 Setup completed! Your AI is live and ready to take calls.');
      
      // Redirect to appropriate dashboard
      setTimeout(() => {
        setShowWizard(false);
        
        const dashboardPaths = {
          restaurant: '/restaurant/dashboard',
          voice: '/voice/dashboard',
          real_estate: '/estate/dashboard',
        };
        
        navigate(dashboardPaths[wizardData.tenantType] || '/merxus');
      }, 2000);
      
    } catch (error) {
      console.error('Error completing setup:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to complete setup';
      toast.error(`Setup failed: ${errorMessage}`);
      setIsSubmitting(false);
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
          tenantType={null}
        />
      )}
    </div>
  );
}
