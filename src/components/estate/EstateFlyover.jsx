import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Play, Pause, Volume2, Download, Upload, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhoneInput, toE164, isValidPhone } from '../../utils/phoneFormatter';
import { updateEstateSettings, fetchEstateSettings } from '../../api/estate';
import { useAuth } from '../../context/AuthContext';

// Storage key for flyover progress
const FLYOVER_STORAGE_KEY = 'merxus_estate_flyover_state';

// Voice options (same as onboarding wizard)
const VOICES = [
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'Neutral',
    description: 'Balanced and professional',
    personality: 'Professional, clear, versatile',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'Male',
    description: 'Warm and friendly',
    personality: 'Welcoming, approachable',
  },
  {
    id: 'ballad',
    name: 'Ballad',
    gender: 'Male',
    description: 'Confident and authoritative',
    personality: 'Authoritative, trustworthy',
  },
  {
    id: 'coral',
    name: 'Coral',
    gender: 'Female',
    description: 'Bright and energetic',
    personality: 'Energetic, enthusiastic',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'Female',
    description: 'Soft and gentle',
    personality: 'Gentle, patient, caring',
  },
];

// Real estate prompt templates
const PROMPT_TEMPLATES = [
  {
    id: 'standard_agent',
    title: 'Standard Real Estate Agent',
    prompt: `You are speaking on behalf of a professional real estate agent. Use a warm, confident, and knowledgeable tone at all times. Your goal is to assist callers, capture their needs, and present the agent as a trusted partner in buying or selling a home.

Highlight:
• Extensive knowledge of neighborhoods, market trends, and property values
• Strong negotiation skills and excellent communication
• Experience guiding buyers, sellers, and investors

If callers ask about listings, you may discuss general availability.
If you don't have specific data, say: "The agent will follow up shortly with exact details."

Do NOT provide legal, financial, or mortgage advice.`
  },
  {
    id: 'luxury_specialist',
    title: 'Luxury Real Estate Specialist',
    prompt: `You are speaking on behalf of a luxury real estate specialist. Use a polished, elegant, and highly professional tone. Make callers feel valued and in good hands.

Highlight:
• Expertise in luxury communities and high-end properties
• Discretion, confidentiality, and white-glove service
• Successful history with high-value clients

If callers ask about properties, speak only in general terms.
If details are needed, say: "The specialist will personally follow up with complete information."

Do NOT disclose sensitive information or invent property details.`
  },
  {
    id: 'first_time_buyer',
    title: 'First-Time Homebuyer Specialist',
    prompt: `You are speaking on behalf of a real estate agent who specializes in first-time homebuyers. Use an encouraging, friendly tone and simplify complex information.

Highlight:
• Step-by-step guidance throughout the buying process
• Clear explanations of pre-approval, offers, escrow, and closing
• Knowledge of affordable neighborhoods and starter homes

If callers have questions, reassure them and gather their needs.

Do NOT give mortgage qualification or financial guarantees.`
  },
  {
    id: 'investor_specialist',
    title: 'Investor-Focused Agent',
    prompt: `You are speaking on behalf of a real estate agent who specializes in investment properties. Use a strategic, opportunity-focused tone.

Highlight:
• Experience with rentals, flips, multi-family, and long-term investments
• Understanding of ROI, rental demand, cap rates, and value-add potential
• Ability to help investors evaluate opportunities

If callers ask for deals, gather investment criteria.

Do NOT promise financial returns.`
  },
  {
    id: 'team_brokerage',
    title: 'Real Estate Team / Brokerage',
    prompt: `You are speaking on behalf of a real estate team or brokerage. Use a polished, welcoming tone.

Highlight:
• Combined expertise across multiple real estate specialties
• Collaborative support from multiple agents
• Strong reputation for responsiveness and professionalism

If callers need help, identify their goals and connect them with the right agent.

Do NOT promise pricing, valuations, or availability.`
  },
  {
    id: 'custom',
    title: 'Custom (Write Your Own)',
    prompt: ''
  }
];

// CSV sample data
const SAMPLE_CSV_CONTENT = `Address,Price,Beds,Baths,Sqft,Description
"123 Main St, Bakersfield, CA 93312",450000,3,2,1850,"Beautiful single-story home with updated kitchen and spacious backyard."
"456 Oak Ave, Bakersfield, CA 93314",525000,4,3,2200,"Stunning two-story home in gated community with pool and spa."
"789 Elm Dr, Bakersfield, CA 93311",375000,2,2,1400,"Charming starter home with new flooring and fresh paint throughout."`;

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'brand', title: 'Your Brand' },
  { id: 'contact', title: 'Contact Info' },
  { id: 'twilio', title: 'Phone Setup' },
  { id: 'voice', title: 'AI Voice' },
  { id: 'hours', title: 'Business Hours' },
  { id: 'listings', title: 'Import Listings' },
  { id: 'complete', title: 'All Done!' },
];

export default function EstateFlyover({ isOpen, onClose, onComplete }) {
  const { agentId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(null);
  const fileInputRef = useRef(null);

  // Form state for all steps
  const [formData, setFormData] = useState({
    // Brand
    name: '',
    brandName: '',
    brokerage: '',
    licenseNumber: '',
    // Contact
    address: '',
    phonePrimary: '',
    websiteUrl: '',
    markets: '',
    // Twilio
    twilioPhoneNumber: '',
    twilioNumberSid: '',
    // Voice
    aiVoice: 'alloy',
    promptTemplate: 'standard_agent',
    customInstructions: PROMPT_TEMPLATES[0].prompt,
    // Hours
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '14:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true },
    },
  });

  // Load saved progress and settings
  useEffect(() => {
    if (isOpen) {
      loadState();
    }
  }, [isOpen]);

  const loadState = async () => {
    setLoading(true);
    try {
      // Load settings from API
      const data = await fetchEstateSettings();
      setSettings(data);

      // Load saved flyover progress from localStorage
      const savedState = localStorage.getItem(FLYOVER_STORAGE_KEY);
      let savedStep = 0;
      let savedFormData = {};

      if (savedState) {
        const parsed = JSON.parse(savedState);
        savedStep = parsed.currentStep || 0;
        savedFormData = parsed.formData || {};
      }

      // Merge settings with saved form data (saved form data takes priority for unsaved changes)
      // Determine custom instructions - use saved, or existing from API, or default template
      const existingInstructions = savedFormData.customInstructions ?? data.aiConfig?.customInstructions ?? data.aiConfig?.systemPrompt ?? '';
      const hasExistingInstructions = existingInstructions && existingInstructions.trim().length > 0;
      
      // Try to match existing instructions to a template
      let matchedTemplate = 'custom';
      if (!hasExistingInstructions) {
        matchedTemplate = 'standard_agent';
      } else {
        const found = PROMPT_TEMPLATES.find(t => t.prompt && existingInstructions.includes(t.prompt.substring(0, 50)));
        if (found) matchedTemplate = found.id;
      }

      setFormData({
        name: savedFormData.name ?? data.name ?? '',
        brandName: savedFormData.brandName ?? data.brandName ?? '',
        brokerage: savedFormData.brokerage ?? data.brokerage ?? '',
        licenseNumber: savedFormData.licenseNumber ?? data.licenseNumber ?? '',
        address: savedFormData.address ?? data.address ?? '',
        phonePrimary: savedFormData.phonePrimary ?? data.phonePrimary ?? data.phoneNumber ?? '',
        websiteUrl: savedFormData.websiteUrl ?? data.websiteUrl ?? '',
        markets: savedFormData.markets ?? (Array.isArray(data.markets) ? data.markets.join(', ') : data.markets ?? ''),
        twilioPhoneNumber: savedFormData.twilioPhoneNumber ?? data.twilioPhoneNumber ?? '',
        twilioNumberSid: savedFormData.twilioNumberSid ?? data.twilioNumberSid ?? '',
        aiVoice: savedFormData.aiVoice ?? data.aiConfig?.voiceName ?? 'alloy',
        promptTemplate: savedFormData.promptTemplate ?? matchedTemplate,
        customInstructions: hasExistingInstructions ? existingInstructions : PROMPT_TEMPLATES[0].prompt,
        businessHours: savedFormData.businessHours ?? data.businessHours ?? formData.businessHours,
      });

      setCurrentStep(savedStep);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load your settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save progress to localStorage
  const saveProgress = (step, data) => {
    const state = {
      currentStep: step,
      formData: data,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(FLYOVER_STORAGE_KEY, JSON.stringify(state));
  };

  // Handle field changes
  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    saveProgress(currentStep, newFormData);
  };

  // Handle phone input with formatting
  const handlePhoneChange = (field, value) => {
    const formatted = formatPhoneInput(value);
    handleChange(field, formatted);
  };

  // Handle business hours changes
  const handleHoursChange = (day, field, value) => {
    const newHours = {
      ...formData.businessHours,
      [day]: {
        ...formData.businessHours[day],
        [field]: value,
      },
    };
    handleChange('businessHours', newHours);
  };

  // Save current step data to backend
  const saveStepData = async () => {
    setSaving(true);
    try {
      // Prepare data based on current step
      const marketsArray = formData.markets
        .split(/[,\n]/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      const dataToSave = {
        name: formData.name,
        brandName: formData.brandName || `${formData.name} Team`,
        brokerage: formData.brokerage,
        licenseNumber: formData.licenseNumber,
        address: formData.address,
        phonePrimary: formData.phonePrimary,
        phoneNumber: formData.phonePrimary,
        websiteUrl: formData.websiteUrl,
        markets: marketsArray,
        twilioPhoneNumber: formData.twilioPhoneNumber,
        twilioNumberSid: formData.twilioNumberSid,
        businessHours: formData.businessHours,
        aiConfig: {
          voiceName: formData.aiVoice,
          customInstructions: formData.customInstructions,
        },
      };

      await updateEstateSettings(dataToSave);
      toast.success('Progress saved!');
      return true;
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const goToStep = (step) => {
    setCurrentStep(step);
    saveProgress(step, formData);
  };

  const nextStep = async () => {
    // Save to backend at certain checkpoints
    if (currentStep === 1 || currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) {
      const saved = await saveStepData();
      if (!saved) return;
    }

    if (currentStep < STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  // Voice preview
  const handlePlayVoice = (voiceId) => {
    window.speechSynthesis.cancel();

    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);

    const sampleText = "Hello! I'm your AI assistant. I can help answer calls, schedule showings, and provide information about your listings.";
    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => setPlayingVoice(null);
    utterance.onerror = () => setPlayingVoice(null);

    window.speechSynthesis.speak(utterance);
  };

  // Request Twilio info email
  const handleRequestTwilioInfo = () => {
    const subject = encodeURIComponent('Request for Twilio Phone Number - Real Estate Agent');
    const body = encodeURIComponent(
      `Hi Merxus Team,\n\nI would like to request my Twilio phone number and SID for my real estate AI assistant.\n\nAgent Name: ${formData.name || '[Your Name]'}\nBrand: ${formData.brandName || '[Your Brand]'}\nEmail: [Your Email]\n\nThank you!`
    );
    window.location.href = `mailto:sales@merxusllc.com?subject=${subject}&body=${body}`;
    toast.success('Email client opened! Send the email to request your Twilio info.');
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merxus_listings_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  // Handle CSV upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just show a success message - actual import would need backend work
    toast.success(`File "${file.name}" selected. Import functionality coming soon!`);
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Complete the flyover
  const handleComplete = async () => {
    await saveStepData();
    localStorage.removeItem(FLYOVER_STORAGE_KEY);
    toast.success('🎉 Setup complete! Your AI assistant is ready.');
    onComplete?.();
    onClose();
  };

  // Close handler
  const handleClose = () => {
    saveProgress(currentStep, formData);
    onClose();
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-700">Loading your settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Merxus AI Setup Guide</h2>
            <p className="text-primary-100 text-sm">Step {currentStep + 1} of {STEPS.length}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-center gap-2">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => index <= currentStep && goToStep(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-primary-500 scale-125'
                  : index < currentStep
                  ? 'bg-primary-300 hover:bg-primary-400 cursor-pointer'
                  : 'bg-gray-300'
              }`}
              disabled={index > currentStep}
              title={step.title}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🏠</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Merxus AI!</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Let's get your AI assistant set up in just a few minutes. We'll walk you through 
                personalizing your brand, configuring your phone, and importing your listings.
              </p>
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 max-w-sm mx-auto">
                <p className="text-sm text-primary-800">
                  <strong>⏱️ Estimated time:</strong> 5-10 minutes
                </p>
                <p className="text-sm text-primary-700 mt-1">
                  You can save and continue later at any time.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Brand */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Your Brand Identity</h3>
                <p className="text-gray-600 text-sm">Help your AI represent you professionally</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Jake Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => handleChange('brandName', e.target.value)}
                  className="input-field"
                  placeholder="e.g., The Jake Smith Team"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use "[Your Name] Team"
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brokerage
                </label>
                <input
                  type="text"
                  value={formData.brokerage}
                  onChange={(e) => handleChange('brokerage', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Keller Williams, RE/MAX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleChange('licenseNumber', e.target.value)}
                  className="input-field"
                  placeholder="e.g., CA-123456"
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Contact Information</h3>
                <p className="text-gray-600 text-sm">How can your clients reach you?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input-field"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.phonePrimary}
                  onChange={(e) => handlePhoneChange('phonePrimary', e.target.value)}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your direct contact number (not your Twilio AI number)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => handleChange('websiteUrl', e.target.value)}
                  className="input-field"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Markets Served
                </label>
                <textarea
                  value={formData.markets}
                  onChange={(e) => handleChange('markets', e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Bakersfield, CA&#10;93312, 93314&#10;Kern County"
                />
                <p className="text-xs text-gray-500 mt-1">
                  List cities, zip codes, or areas (comma or line separated)
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Twilio Setup */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Phone Setup</h3>
                <p className="text-gray-600 text-sm">Configure your AI phone number</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  📞 Don't have your Twilio info yet?
                </p>
                <p className="text-sm text-amber-700 mb-3">
                  Your Twilio phone number is provided by Merxus. Click below to request it.
                </p>
                <button
                  onClick={handleRequestTwilioInfo}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <Mail size={16} />
                  Request from Merxus
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twilio Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.twilioPhoneNumber}
                  onChange={(e) => handleChange('twilioPhoneNumber', e.target.value)}
                  className="input-field"
                  placeholder="+15551234567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be in E.164 format (e.g., +15551234567)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twilio Number SID <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.twilioNumberSid}
                  onChange={(e) => handleChange('twilioNumberSid', e.target.value)}
                  className="input-field"
                  placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Starts with "PN" - provided by Merxus
                </p>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                You can skip this step and add it later in Settings.
              </p>
            </div>
          )}

          {/* Step 4: Voice Selection */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Choose Your AI Voice</h3>
                <p className="text-gray-600 text-sm">Select the voice that represents your brand</p>
              </div>

              <div className="space-y-2">
                {VOICES.map((voice) => {
                  const isSelected = formData.aiVoice === voice.id;
                  const isPlaying = playingVoice === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => handleChange('aiVoice', voice.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{voice.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {voice.gender}
                          </span>
                          {isSelected && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500 text-white">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{voice.description}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoice(voice.id);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-600'
                        }`}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Personality Template
                  </label>
                  <select
                    value={formData.promptTemplate || 'standard_agent'}
                    onChange={(e) => {
                      const template = PROMPT_TEMPLATES.find(t => t.id === e.target.value);
                      handleChange('promptTemplate', e.target.value);
                      if (template && template.id !== 'custom') {
                        handleChange('customInstructions', template.prompt);
                      }
                    }}
                    className="input-field"
                  >
                    {PROMPT_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a pre-built personality or write your own
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Instructions
                  </label>
                  <textarea
                    value={formData.customInstructions}
                    onChange={(e) => {
                      handleChange('customInstructions', e.target.value);
                      handleChange('promptTemplate', 'custom');
                    }}
                    className="input-field resize-none text-sm"
                    rows={6}
                    placeholder="Your AI assistant's personality and instructions will appear here..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Edit the template above or write completely custom instructions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Business Hours */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Business Hours</h3>
                <p className="text-gray-600 text-sm">When is your AI available to take calls?</p>
              </div>

              <div className="space-y-3">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const hours = formData.businessHours[day];
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-24">
                        <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                          className="w-4 h-4 checkbox-green rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">Open</span>
                      </label>
                      {!hours.closed && (
                        <>
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                            className="input-field !py-1.5 !px-2 w-28 text-sm"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                            className="input-field !py-1.5 !px-2 w-28 text-sm"
                          />
                        </>
                      )}
                      {hours.closed && (
                        <span className="text-sm text-gray-400 italic">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Outside these hours, your AI will take messages and schedule callbacks.
              </p>
            </div>
          )}

          {/* Step 6: Import Listings */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Import Your Listings</h3>
                <p className="text-gray-600 text-sm">Add your property listings so your AI can answer questions about them</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">CSV Format</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Download our template to see the expected format:
                </p>
                <div className="bg-white rounded-lg p-3 border font-mono text-xs text-gray-700 overflow-x-auto mb-3">
                  Address, Price, Beds, Baths, Sqft, Description
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <Download size={16} />
                  Download Template
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-3">
                  Drag and drop your CSV file here, or
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Browse Files
                </label>
              </div>

              <p className="text-xs text-gray-500 text-center">
                You can also add listings manually from the Listings page later.
              </p>
            </div>
          )}

          {/* Step 7: Complete */}
          {currentStep === 7 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">You're All Set! 🎉</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your AI assistant is ready to help manage your real estate business. 
                Calls to your Twilio number will now be handled by your personalized AI.
              </p>
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 max-w-sm mx-auto text-left">
                <h4 className="font-semibold text-primary-900 mb-2">Quick Links:</h4>
                <ul className="text-sm text-primary-800 space-y-1">
                  <li>📊 <a href="/estate/dashboard" className="underline hover:text-primary-600">Dashboard</a> - View your activity</li>
                  <li>🏠 <a href="/estate/listings" className="underline hover:text-primary-600">Listings</a> - Manage properties</li>
                  <li>📞 <a href="/estate/calls" className="underline hover:text-primary-600">Calls</a> - Review AI conversations</li>
                  <li>⚙️ <a href="/estate/settings" className="underline hover:text-primary-600">Settings</a> - Adjust your preferences</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <div className="text-sm text-gray-500">
            {STEPS[currentStep].title}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={saving}
              className="flex items-center gap-1 px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : currentStep === 0 ? "Let's Go!" : 'Next'}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-1 px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Finish Setup'}
              <Check size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
