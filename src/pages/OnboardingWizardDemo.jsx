import { useState } from 'react';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function OnboardingWizardDemo() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(true);

  const handleComplete = async (wizardData) => {
    console.log('Wizard completed with data:', wizardData);
    toast.success('Onboarding completed! Redirecting to dashboard...');
    
    // In real implementation, this would:
    // 1. Create tenant in Firestore
    // 2. Set up Twilio integration
    // 3. Configure AI settings
    // 4. Redirect to appropriate dashboard
    
    setTimeout(() => {
      setShowWizard(false);
      // navigate('/dashboard'); // Uncomment when ready
    }, 2000);
  };

  const handleClose = () => {
    const confirm = window.confirm('Are you sure you want to exit the setup wizard? Your progress will be lost.');
    if (confirm) {
      setShowWizard(false);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {!showWizard ? (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Wizard Demo</h1>
          <p className="text-gray-600 mb-6">Click below to see the onboarding wizard</p>
          <button
            onClick={() => setShowWizard(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all shadow-lg"
          >
            Launch Wizard
          </button>
        </div>
      ) : (
        <OnboardingWizard
          onClose={handleClose}
          onComplete={handleComplete}
          userEmail="demo@example.com"
          tenantType={null}
        />
      )}
    </div>
  );
}
