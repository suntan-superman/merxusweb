import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';
import { useAuth } from '../../context/AuthContext';

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(true);

  const handleComplete = async (wizardData) => {
    console.log('Wizard completed with data:', wizardData);
    
    try {
      // TODO: In real implementation, this would:
      // 1. Create tenant in Firestore
      // 2. Set up Twilio integration
      // 3. Configure AI settings
      // 4. Redirect to appropriate dashboard based on tenant type
      
      toast.success('Setup completed successfully! Tenant created.');
      
      // For now, just redirect back to merxus dashboard
      setTimeout(() => {
        setShowWizard(false);
        navigate('/merxus');
      }, 1500);
    } catch (error) {
      console.error('Error completing setup:', error);
      toast.error('Failed to complete setup. Please try again.');
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
          userEmail={user?.email}
          tenantType={null}
        />
      )}
    </div>
  );
}
