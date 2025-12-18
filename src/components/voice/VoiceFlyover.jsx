import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Play, Pause, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhoneInput } from '../../utils/phoneFormatter';
import { updateVoiceSettings, fetchVoiceSettings } from '../../api/voice';
import { getCategories, getIndustriesForCategory } from '../../../data/voicePromptLibraryWithRouting';
import { useAuth } from '../../context/AuthContext';

// Storage key for flyover progress
const FLYOVER_STORAGE_KEY = 'merxus_voice_flyover_state';

// Voice options
const VOICES = [
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'Neutral',
    description: 'Balanced and professional',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'Male',
    description: 'Warm and friendly',
  },
  {
    id: 'ballad',
    name: 'Ballad',
    gender: 'Male',
    description: 'Confident and authoritative',
  },
  {
    id: 'coral',
    name: 'Coral',
    gender: 'Female',
    description: 'Bright and energetic',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'Female',
    description: 'Soft and gentle',
  },
];

// Default service description templates by category
const SERVICE_TEMPLATES = {
  'Healthcare': `Our office provides comprehensive healthcare services including:
• Patient consultations and examinations
• Preventive care and wellness visits
• Diagnosis and treatment of common conditions
• Referrals to specialists when needed
• Prescription management

We accept most major insurance plans. Please call to verify your coverage.`,
  
  'Legal': `Our firm offers professional legal services including:
• Initial consultations
• Case evaluation and strategy
• Document preparation and review
• Court representation
• Legal advice and counsel

We handle cases with confidentiality and dedication to client success.`,
  
  'Home Services': `We provide quality home services including:
• Free estimates and consultations
• Professional installation and repairs
• Maintenance programs available
• Licensed and insured technicians
• Satisfaction guaranteed

Call us for a free quote on your next project.`,
  
  'Professional Services': `Our office provides professional services including:
• Initial consultations
• Project planning and execution
• Ongoing support and maintenance
• Competitive pricing
• Experienced team members

Contact us to discuss how we can help with your needs.`,
  
  'General': `We offer quality services to meet your needs:
• Professional and courteous staff
• Competitive pricing
• Flexible scheduling
• Customer satisfaction guaranteed

Please call for more information about our services.`,
};

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'business', title: 'Your Business' },
  { id: 'contact', title: 'Contact Info' },
  { id: 'industry', title: 'Industry' },
  { id: 'services', title: 'Services' },
  { id: 'twilio', title: 'Phone Setup' },
  { id: 'voice', title: 'AI Voice' },
  { id: 'hours', title: 'Business Hours' },
  { id: 'complete', title: 'All Done!' },
];

export default function VoiceFlyover({ isOpen, onClose, onComplete }) {
  const { officeId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(null);
  
  // Category/Industry dropdowns
  const [categories] = useState(() => {
    const base = getCategories();
    return Array.from(new Set([...base, 'General']));
  });
  const [industries, setIndustries] = useState([]);

  // Form state for all steps
  const [formData, setFormData] = useState({
    // Business
    name: '',
    // Contact
    address: '',
    phoneNumber: '',
    websiteUrl: '',
    // Industry
    businessType: {
      category: '',
      industry: '',
    },
    // Services
    servicesDescription: '',
    // Twilio
    twilioPhoneNumber: '',
    twilioNumberSid: '',
    // Voice
    aiVoice: 'alloy',
    customInstructions: '',
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

  // Update industries when category changes
  useEffect(() => {
    if (formData.businessType.category) {
      const categoryIndustries = formData.businessType.category === 'General'
        ? ['General']
        : getIndustriesForCategory(formData.businessType.category);
      setIndustries(categoryIndustries);
    } else {
      setIndustries([]);
    }
  }, [formData.businessType.category]);

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
      const data = await fetchVoiceSettings();
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

      // Merge settings with saved form data
      setFormData({
        name: savedFormData.name ?? data.name ?? '',
        address: savedFormData.address ?? data.address ?? '',
        phoneNumber: savedFormData.phoneNumber ?? data.phoneNumber ?? '',
        websiteUrl: savedFormData.websiteUrl ?? data.websiteUrl ?? '',
        businessType: savedFormData.businessType ?? data.businessType ?? { category: '', industry: '' },
        servicesDescription: savedFormData.servicesDescription ?? data.servicesDescription ?? '',
        twilioPhoneNumber: savedFormData.twilioPhoneNumber ?? data.twilioPhoneNumber ?? '',
        twilioNumberSid: savedFormData.twilioNumberSid ?? data.twilioNumberSid ?? '',
        aiVoice: savedFormData.aiVoice ?? data.aiConfig?.voiceName ?? 'alloy',
        customInstructions: savedFormData.customInstructions ?? data.aiConfig?.customInstructions ?? '',
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

  // Handle business type changes
  const handleBusinessTypeChange = (field, value) => {
    const newBusinessType = { ...formData.businessType, [field]: value };
    
    // Reset industry when category changes
    if (field === 'category') {
      newBusinessType.industry = '';
      
      // Auto-populate services description based on category
      const template = SERVICE_TEMPLATES[value] || SERVICE_TEMPLATES['General'];
      handleChange('servicesDescription', template);
    }
    
    handleChange('businessType', newBusinessType);
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
      const dataToSave = {
        name: formData.name,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        websiteUrl: formData.websiteUrl,
        businessType: formData.businessType,
        servicesDescription: formData.servicesDescription,
        twilioPhoneNumber: formData.twilioPhoneNumber,
        twilioNumberSid: formData.twilioNumberSid,
        businessHours: formData.businessHours,
        aiConfig: {
          voiceName: formData.aiVoice,
          customInstructions: formData.customInstructions,
        },
      };

      await updateVoiceSettings(dataToSave);
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
    if ([1, 2, 3, 4, 5, 6, 7].includes(currentStep)) {
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

    const sampleText = "Hello! Thank you for calling. How may I assist you today?";
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
    const subject = encodeURIComponent('Request for Twilio Phone Number - Voice Portal');
    const body = encodeURIComponent(
      `Hi Merxus Team,\n\nI would like to request my Twilio phone number and SID for my AI phone assistant.\n\nBusiness Name: ${formData.name || '[Your Business Name]'}\nEmail: [Your Email]\n\nThank you!`
    );
    window.location.href = `mailto:sales@merxusllc.com?subject=${subject}&body=${body}`;
    toast.success('Email client opened! Send the email to request your Twilio info.');
  };

  // Complete the flyover
  const handleComplete = async () => {
    await saveStepData();
    localStorage.removeItem(FLYOVER_STORAGE_KEY);
    toast.success('🎉 Setup complete! Your AI phone assistant is ready.');
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
        <div className="p-8 bg-white shadow-2xl rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 rounded-full border-primary-500 border-t-transparent animate-spin" />
            <span className="text-gray-700">Loading your settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 overflow-hidden bg-white shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600">
          <div>
            <h2 className="text-xl font-bold text-white">Merxus Voice Setup Guide</h2>
            <p className="text-sm text-primary-100">Step {currentStep + 1} of {STEPS.length}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 transition-colors rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 px-6 py-3 border-b bg-gray-50">
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
            <div className="py-8 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100">
                <span className="text-4xl">📞</span>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">Welcome to Merxus Voice!</h3>
              <p className="max-w-md mx-auto mb-6 text-gray-600">
                Let's set up your AI phone assistant in just a few minutes. We'll walk you through 
                configuring your business info, services, and phone settings.
              </p>
              <div className="max-w-sm p-4 mx-auto border bg-primary-50 border-primary-200 rounded-xl">
                <p className="text-sm text-primary-800">
                  <strong>⏱️ Estimated time:</strong> 5-10 minutes
                </p>
                <p className="mt-1 text-sm text-primary-700">
                  You can save and continue later at any time.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Business Name */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="mb-6 text-center">
                <h3 className="text-xl font-bold text-gray-900">Your Business</h3>
                <p className="text-sm text-gray-600">Tell us about your business</p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Smith Law Office, ABC Plumbing"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This is how your AI will identify your business to callers
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="mb-6 text-center">
                <h3 className="text-xl font-bold text-gray-900">Contact Information</h3>
                <p className="text-sm text-gray-600">Your business contact details</p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Business Address
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
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handlePhoneChange('phoneNumber', e.target.value)}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your direct business number (not your Twilio AI number)
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
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
            </div>
          )}

          {/* Step 3: Industry Selection */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="mb-6 text-center">
                <h3 className="text-xl font-bold text-gray-900">Your Industry</h3>
                <p className="text-sm text-gray-600">Help us customize your AI for your industry</p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Business Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.businessType.category}
                  onChange={(e) => handleBusinessTypeChange('category', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {industries.length > 0 && (
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Industry / Specialty
                  </label>
                  <select
                    value={formData.businessType.industry}
                    onChange={(e) => handleBusinessTypeChange('industry', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select an industry...</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    This helps your AI use industry-specific language
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Services Description */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="mb-6 text-center">
                <h3 className="text-xl font-bold text-gray-900">Services & Products</h3>
                <p className="text-sm text-gray-600">Describe what your business offers</p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Services Description
                </label>
                <textarea
                  value={formData.servicesDescription}
                  onChange={(e) => handleChange('servicesDescription', e.target.value)}
                  className="resize-none input-field"
                  rows={8}
                  placeholder="Describe the services or products your business offers..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your AI will use this to answer questions about your services
                </p>
              </div>

              <div className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>💡 Tip:</strong> Be specific! Include key services, pricing ranges (if applicable), 
                  and any specialties that set you apart.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Twilio Setup */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="mb-6 text-center">
                <h3 className="text-xl font-bold text-gray-900">Phone Setup</h3>
                <p className="text-sm text-gray-600">Configure your AI phone number</p>
              </div>

              <div className="p-4 mb-4 border bg-amber-50 border-amber-200 rounded-xl">
                <p className="mb-2 text-sm font-medium text-amber-800">
                  📞 Don't have your Twilio info yet?
                </p>
                <p className="mb-3 text-sm text-amber-700">
                  Your Twilio phone number is provided by Merxus. Click below to request it.
                </p>
                <button
                  onClick={handleRequestTwilioInfo}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-amber-600 hover:bg-amber-700"
                >
                  <Mail size={16} />
                  Request from Merxus
                </button>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Twilio Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.twilioPhoneNumber}
                  onChange={(e) => handleChange('twilioPhoneNumber', e.target.value)}
                  className="input-field"
                  placeholder="+15551234567"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be in E.164 format (e.g., +15551234567)
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Twilio Number SID <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.twilioNumberSid}
                  onChange={(e) => handleChange('twilioNumberSid', e.target.value)}
                  className="input-field"
                  placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Starts with "PN" - provided by Merxus
                </p>
              </div>

              <p className="mt-4 text-xs text-center text-gray-500">
                You can skip this step and add it later in Settings.
              </p>
            </div>
          )}

          {/* Step 6: Voice Selection */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="mb-4 text-center">
                <h3 className="text-xl font-bold text-gray-900">Choose Your AI Voice</h3>
                <p className="text-sm text-gray-600">Select the voice that represents your business</p>
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

              <div className="mt-4">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Custom Instructions <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={formData.customInstructions}
                  onChange={(e) => handleChange('customInstructions', e.target.value)}
                  className="resize-none input-field"
                  rows={3}
                  placeholder="Add any special instructions for your AI assistant..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  E.g., "Always ask for a callback number before ending the call"
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Business Hours */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="mb-4 text-center">
                <h3 className="text-xl font-bold text-gray-900">Business Hours</h3>
                <p className="text-sm text-gray-600">When is your AI available to take calls?</p>
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
                          className="w-4 h-4 border-gray-300 rounded checkbox-green focus:ring-primary-500"
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
                        <span className="text-sm italic text-gray-400">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-center text-gray-500">
                Outside these hours, your AI will take messages and offer to schedule callbacks.
              </p>
            </div>
          )}

          {/* Step 8: Complete */}
          {currentStep === 8 && (
            <div className="py-8 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100">
                <Check size={40} className="text-primary-600" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">You're All Set! 🎉</h3>
              <p className="max-w-md mx-auto mb-6 text-gray-600">
                Your AI phone assistant is ready to handle calls for your business. 
                Calls to your Twilio number will now be answered by your personalized AI.
              </p>
              <div className="max-w-sm p-4 mx-auto text-left border bg-primary-50 border-primary-200 rounded-xl">
                <h4 className="mb-2 font-semibold text-primary-900">Quick Links:</h4>
                <ul className="space-y-1 text-sm text-primary-800">
                  <li>📊 <a href="/voice" className="underline hover:text-primary-600">Dashboard</a> - View your activity</li>
                  <li>📞 <a href="/voice/calls" className="underline hover:text-primary-600">Calls</a> - Review AI conversations</li>
                  <li>📬 <a href="/voice/voicemail" className="underline hover:text-primary-600">Voicemail</a> - Listen to messages</li>
                  <li>⚙️ <a href="/voice/settings" className="underline hover:text-primary-600">Settings</a> - Adjust your preferences</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
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
              className="flex items-center gap-1 px-5 py-2 font-medium text-white transition-colors rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : currentStep === 0 ? "Let's Go!" : 'Next'}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-1 px-5 py-2 font-medium text-white transition-colors rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
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
