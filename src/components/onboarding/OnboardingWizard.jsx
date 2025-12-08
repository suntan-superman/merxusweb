import { useState } from 'react';
import { X } from 'lucide-react';
import IndustrySelection from './steps/IndustrySelection';
import BusinessDetails from './steps/BusinessDetails';
import TwilioSetup from './steps/TwilioSetup';
import VoiceSelection from './steps/VoiceSelection';
import IndustryCustomization from './steps/IndustryCustomization';
import TestAI from './steps/TestAI';
import Completion from './steps/Completion';
import ConfirmationModal from '../common/ConfirmationModal';

const TOTAL_STEPS = 7;

export default function OnboardingWizard({ onClose, onComplete, userEmail, tenantType: initialTenantType }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [wizardData, setWizardData] = useState({
    // Step 1: Industry
    tenantType: initialTenantType || null,
    
    // Step 2: Business Basics
    businessName: '',
    ownerName: '',
    email: userEmail || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    timezone: 'America/Los_Angeles',
    
    // Step 3: Twilio
    twilioPhoneNumber: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    
    // Step 4: Voice
    aiVoice: 'alloy',
    
    // Step 5: Industry-specific
    industryData: {},
  });

  const updateWizardData = (updates) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return !!wizardData.tenantType;
    }
    if (currentStep === 2) {
      return (
        wizardData.businessName?.trim() &&
        wizardData.ownerName?.trim() &&
        wizardData.email?.trim() &&
        wizardData.phone?.trim() &&
        wizardData.address?.trim() &&
        wizardData.city?.trim() &&
        wizardData.state?.trim() &&
        wizardData.zip?.trim()
      );
    }
    if (currentStep === 3) {
      // Validate Twilio credentials
      const cleanedPhone = wizardData.twilioPhoneNumber?.replace(/[\s\-\(\)]/g, '') || '';
      const phoneValid = /^\+?1?\d{10,15}$/.test(cleanedPhone);
      const hasAccountSid = !!wizardData.twilioAccountSid?.trim();
      const hasAuthToken = !!wizardData.twilioAuthToken?.trim();
      
      // Debug logging
      console.log('[Wizard] Step 3 validation:', {
        twilioPhoneNumber: wizardData.twilioPhoneNumber,
        cleanedPhone,
        phoneValid,
        hasAccountSid,
        hasAuthToken,
        canProceed: phoneValid && hasAccountSid && hasAuthToken,
      });
      
      return phoneValid && hasAccountSid && hasAuthToken;
    }
    return true; // Other steps can proceed
  };

  const goToNextStep = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (onComplete) {
      await onComplete(wizardData);
    }
  };

  // Progress calculation
  const progress = (currentStep / TOTAL_STEPS) * 100;

  // Step 5 title based on tenant type
  const getStep5Title = () => {
    switch (wizardData.tenantType) {
      case 'restaurant':
        return 'Restaurant Settings';
      case 'real_estate':
        return 'Real Estate Settings';
      case 'voice':
        return 'Office Settings';
      case 'general':
        return 'Business Settings';
      default:
        return 'Industry Settings';
    }
  };

  // Step titles
  const stepTitles = [
    'Choose Your Industry',
    'Business Details',
    'Twilio Phone Setup',
    'AI Voice Selection',
    getStep5Title(),
    'Test Your AI',
    'All Set!',
  ];

  const handleCloseAttempt = () => {
    if (currentStep === 7) {
      // If on completion step, allow closing without confirmation
      onClose();
    } else {
      // Show confirmation for other steps
      setShowExitConfirm(true);
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ height: '85vh', maxHeight: '700px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-500 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Welcome to Merxus AI</h2>
                <p className="text-sm text-green-50">Let's get your AI assistant set up</p>
              </div>
            </div>
            <button
              onClick={handleCloseAttempt}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-xs text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              
              return (
                <div key={stepNumber} className="flex flex-col items-center gap-1" style={{ width: `${100 / TOTAL_STEPS}%` }}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-green-500 text-white ring-4 ring-green-100'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </div>
                  <span className={`text-[10px] text-center leading-tight ${isCurrent ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                    {stepTitles[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area - Fixed Height with Internal Scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {/* Step content will go here */}
            {currentStep === 1 && (
              <IndustrySelection
                selectedIndustry={wizardData.tenantType}
                onSelect={(industry) => updateWizardData({ tenantType: industry })}
              />
            )}
            {currentStep === 2 && (
              <BusinessDetails
                data={wizardData}
                onChange={updateWizardData}
              />
            )}
            {currentStep === 3 && (
              <TwilioSetup
                data={wizardData}
                onChange={updateWizardData}
                tenantType={wizardData.tenantType}
                tenantId="wizard-temp" // Temporary ID for wizard flow
              />
            )}
            {currentStep === 4 && (
              <VoiceSelection
                selectedVoice={wizardData.aiVoice}
                onSelect={(voice) => updateWizardData({ aiVoice: voice })}
                tenantType={wizardData.tenantType}
              />
            )}
            {currentStep === 5 && (
              <IndustryCustomization
                tenantType={wizardData.tenantType}
                data={wizardData}
                onChange={updateWizardData}
              />
            )}
            {currentStep === 6 && (
              <TestAI phoneNumber={wizardData.twilioPhoneNumber} />
            )}
            {currentStep === 7 && (
              <Completion
                tenantType={wizardData.tenantType}
                businessName={wizardData.businessName}
              />
            )}
          </div>
        </div>

        {/* Footer - Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              currentStep === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < TOTAL_STEPS && currentStep !== 3 && currentStep !== 6 && (
              <button
                onClick={goToNextStep}
                className="px-4 py-2.5 rounded-lg font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all"
              >
                Skip for now
              </button>
            )}
            
            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  !canProceed()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                }`}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
              >
                Go to Dashboard →
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Exit Confirmation Modal */}
      <ConfirmationModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleConfirmExit}
        title="Exit Setup Wizard?"
        message="Are you sure you want to exit the setup wizard? Your progress will be lost and you'll need to start over."
        confirmText="Yes, Exit"
        cancelText="Continue Setup"
        variant="warning"
      />
    </>
  );
}
