import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import apiClient from '../../api/client';
import IndustrySelection from './steps/IndustrySelection';
import BusinessDetails from './steps/BusinessDetails';
import VoiceSelection from './steps/VoiceSelection';
import IndustryCustomization from './steps/IndustryCustomization';
import PaymentCheckout from './steps/PaymentCheckout';
import TwilioSetup from './steps/TwilioSetup';
import TestAI from './steps/TestAI';
import Completion from './steps/Completion';
import ConfirmationModal from '../common/ConfirmationModal';

const TOTAL_STEPS = 8;
const STORAGE_KEY = 'merxus_onboarding_wizard';

export default function OnboardingWizard({
  onClose,
  onComplete,
  onSwitchToOwner,
  userEmail,
  tenantType: initialTenantType,
  authMethod = 'password',
  prefillEmail,
  prefillName,
  tenantCreated,
  skipPayment = false,
}) {
  const isAppleAuth = authMethod === 'apple';
  const shouldSkipIndustryStep = !!initialTenantType;
  const minimumStep = shouldSkipIndustryStep ? 2 : 1;
  const contentRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(minimumStep);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [dataSaved, setDataSaved] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ status: 'idle', message: '' });
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [lastCheckedEmail, setLastCheckedEmail] = useState('');
  const [wizardData, setWizardData] = useState({
    // Step 1: Industry
    tenantType: initialTenantType || null,
    authMethod,
    
    // Step 2: Business Basics (avoid pre-populating unless Apple sign-in)
    businessName: '',
    ownerName: prefillName || '',
    email: prefillEmail || '', // Apple sign-in can prefill
    tempPassword: '', // Optional for Apple sign-in
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

    // Payment + reservation
    tenantId: null,
    officeId: null,
    restaurantId: null,
    agentId: null,
    reservationId: null,
    reservationExpiresAt: null,
    paymentCompleted: skipPayment ? true : false,
    paymentSessionId: null,
    promoCode: '',
  });

  const resolvedTenantId =
    tenantCreated?.officeId ||
    tenantCreated?.restaurantId ||
    tenantCreated?.agentId ||
    tenantCreated?.tenantId ||
    wizardData.officeId ||
    wizardData.restaurantId ||
    wizardData.agentId ||
    wizardData.tenantId ||
    null;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.wizardData) {
        setWizardData((prev) => ({ ...prev, ...parsed.wizardData }));
      }
      if (parsed?.currentStep) {
        setCurrentStep(parsed.currentStep);
      }
      if (parsed?.dataSaved) {
        setDataSaved(parsed.dataSaved);
      }
    } catch (error) {
      console.error('Failed to restore wizard state:', error);
    }
  }, []);

  useEffect(() => {
    if (shouldSkipIndustryStep && currentStep < 2) {
      setCurrentStep(2);
    }
  }, [shouldSkipIndustryStep, currentStep]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ wizardData, currentStep, dataSaved })
      );
    } catch (error) {
      console.error('Failed to persist wizard state:', error);
    }
  }, [wizardData, currentStep, dataSaved]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  useEffect(() => {
    if (skipPayment && !wizardData.paymentCompleted) {
      setWizardData((prev) => ({ ...prev, paymentCompleted: true }));
    }
  }, [skipPayment, wizardData.paymentCompleted]);

  useEffect(() => {
    // Recovery for stale localStorage sessions that reached Twilio setup without a saved tenant id.
    if (skipPayment && currentStep >= 6 && !resolvedTenantId) {
      setDataSaved(false);
      setCurrentStep(4);
    }
  }, [skipPayment, currentStep, resolvedTenantId]);

  const updateWizardData = (updates) => {
    if (!updates || typeof updates !== 'object') return;

    setWizardData((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      Object.entries(updates).forEach(([key, value]) => {
        if (next[key] !== value) {
          next[key] = value;
          hasChanges = true;
        }
      });

      return hasChanges ? next : prev;
    });
  };

  useEffect(() => {
    const normalizedEmail = (wizardData.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      if (emailValidation.status !== 'idle' || lastCheckedEmail) {
        setEmailValidation({ status: 'idle', message: '' });
        setLastCheckedEmail('');
      }
      return;
    }

    if (
      lastCheckedEmail &&
      normalizedEmail !== lastCheckedEmail &&
      emailValidation.status !== 'idle'
    ) {
      setEmailValidation({ status: 'idle', message: '' });
    }
  }, [wizardData.email, emailValidation.status, lastCheckedEmail]);

  const formatProviderLabel = (provider) => {
    switch (provider) {
      case 'apple':
        return 'Apple Sign-In';
      case 'google':
        return 'Google Sign-In';
      case 'email':
        return 'Email & Password';
      default:
        return null;
    }
  };

  const validateEmailAvailability = async ({ force = false } = {}) => {
    if (isAppleAuth) return true;

    const email = (wizardData.email || '').trim().toLowerCase();
    if (!email) return false;

    if (!force && email === lastCheckedEmail) {
      if (emailValidation.status === 'available') return true;
      if (emailValidation.status === 'exists') return false;
    }

    try {
      setIsCheckingEmail(true);
      setEmailValidation({ status: 'checking', message: 'Checking email availability...' });

      const response = await apiClient.post('/auth/check-email', { email });
      const exists = !!response?.data?.exists;
      const provider = response?.data?.provider;
      setLastCheckedEmail(email);

      if (exists) {
        const providerLabel = formatProviderLabel(provider);
        setEmailValidation({
          status: 'exists',
          message: providerLabel
            ? `This email is already registered via ${providerLabel}. Use a different email.`
            : 'This email is already registered. Use a different email.',
        });
        return false;
      }

      setEmailValidation({
        status: 'available',
        message: 'Email is available.',
      });
      return true;
    } catch (error) {
      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Unable to validate email right now. Please try again.';

      setEmailValidation({
        status: 'error',
        message: backendMessage,
      });
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
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
        (isAppleAuth || (wizardData.tempPassword?.trim() && wizardData.tempPassword.length >= 6)) &&
        wizardData.phone?.trim() &&
        wizardData.address?.trim() &&
        wizardData.city?.trim() &&
        wizardData.state?.trim() &&
        wizardData.zip?.trim() &&
        !isCheckingEmail &&
        emailValidation.status !== 'exists'
      );
    }
    if (currentStep === 3) {
      return !!wizardData.aiVoice;
    }
    if (currentStep === 5) {
      if (skipPayment) return true;
      return !!wizardData.paymentCompleted;
    }
    if (currentStep === 6) {
      if (!wizardData.paymentCompleted) {
        return false;
      }
      const cleanedPhone = wizardData.twilioPhoneNumber?.replace(/[\s\-\(\)]/g, '') || '';
      const phoneValid = /^\+?1?\d{10,15}$/.test(cleanedPhone);
      const hasAccountSid = !!wizardData.twilioAccountSid?.trim();
      const hasAuthToken = !!wizardData.twilioAuthToken?.trim();
      const isAutoProvisioned =
        wizardData.twilioAccountSid === 'auto_provisioned' ||
        wizardData.twilioAuthToken === 'auto_provisioned';

      if (isAutoProvisioned) {
        return phoneValid;
      }

      return phoneValid && hasAccountSid && hasAuthToken;
    }
    return true; // Other steps can proceed
  };

  const goToNextStep = async () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      if (currentStep === 2 && !isAppleAuth) {
        const emailIsAvailable = await validateEmailAvailability();
        if (!emailIsAvailable) return;
      }

      // Special handling: Save data before payment step
      if (currentStep === 4 && !dataSaved && onComplete) {
        console.log('💾 Saving tenant data before payment step...');
        try {
          const saveResult = await onComplete(wizardData, true); // Pass 'isPreSave' flag
          if (saveResult && typeof saveResult === 'object') {
            const createdTenantId =
              saveResult.officeId ||
              saveResult.restaurantId ||
              saveResult.agentId ||
              saveResult.tenantId ||
              null;
            setWizardData((prev) => ({
              ...prev,
              tenantId: createdTenantId || prev.tenantId,
              officeId: saveResult.officeId || prev.officeId || null,
              restaurantId: saveResult.restaurantId || prev.restaurantId || null,
              agentId: saveResult.agentId || prev.agentId || null,
            }));
          }
          setDataSaved(true);
          console.log('✅ Data saved! User can now proceed to payment.');
        } catch (error) {
          console.error('❌ Failed to save data:', error);
          return;
        }
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > minimumStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // If data wasn't saved yet (user skipped through), save now
    if (!dataSaved && onComplete) {
      await onComplete(wizardData, false);
    } else if (onComplete) {
      // Data already saved, just trigger completion callback for redirect
      await onComplete(wizardData, false);
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wizard storage:', error);
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
    'AI Voice Selection',
    getStep5Title(),
    skipPayment ? 'Payment (Skipped)' : 'Payment',
    'Twilio Phone Setup',
    'Test Your AI',
    'All Set!',
  ];

  const handleCloseAttempt = () => {
    if (currentStep === TOTAL_STEPS) {
      // If on completion step, allow closing without confirmation
      onClose();
    } else {
      // Show confirmation for other steps
      setShowExitConfirm(true);
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wizard storage:', error);
    }
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
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6">
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
                hidePassword={isAppleAuth}
                emailReadOnly={isAppleAuth && !!prefillEmail}
                onEmailBlur={() => validateEmailAvailability({ force: true })}
                emailValidationStatus={emailValidation.status}
                emailValidationMessage={emailValidation.message}
              />
            )}
            {currentStep === 3 && (
              <VoiceSelection
                selectedVoice={wizardData.aiVoice}
                onSelect={(voice) => updateWizardData({ aiVoice: voice })}
                tenantType={wizardData.tenantType}
              />
            )}
            {currentStep === 4 && (
              <IndustryCustomization
                tenantType={wizardData.tenantType}
                data={wizardData}
                onChange={updateWizardData}
              />
            )}
            {currentStep === 5 && (
              skipPayment ? (
                <div className="py-6">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                    <h3 className="text-xl font-bold text-gray-900">Payment Skipped For Admin Setup</h3>
                    <p className="mt-2 text-sm text-gray-700">
                      This setup is being created from the Merxus admin wizard, so checkout is not required.
                      Continue to assign a Twilio number.
                    </p>
                  </div>
                </div>
              ) : (
                <PaymentCheckout
                  data={wizardData}
                  onChange={updateWizardData}
                  tenantType={wizardData.tenantType}
                  tenantId={resolvedTenantId}
                />
              )
            )}
            {currentStep === 6 && (
              <TwilioSetup
                data={wizardData}
                onChange={updateWizardData}
                tenantType={wizardData.tenantType}
                tenantId={resolvedTenantId}
              />
            )}
            {currentStep === 7 && (
              <TestAI phoneNumber={wizardData.twilioPhoneNumber} />
            )}
            {currentStep === 8 && (
              <Completion
                tenantType={wizardData.tenantType}
                businessName={wizardData.businessName}
                ownerEmail={wizardData.email}
                ownerPassword={wizardData.tempPassword}
                onSwitchToOwner={() => onSwitchToOwner(wizardData.email, wizardData.tempPassword)}
              />
            )}
          </div>
        </div>

        {/* Footer - Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === minimumStep}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              currentStep === minimumStep
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < TOTAL_STEPS && currentStep !== 5 && currentStep !== 6 && currentStep !== 7 && (
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
