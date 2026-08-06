import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhoneInput, toE164, isValidPhone } from '../../utils/phoneFormatter';
import * as XLSX from 'xlsx';
import { updateEstateSettings, fetchEstateSettings, createListing } from '../../api/estate';
import { useAuth } from '../../context/AuthContext';
import { validateForm, estateBrandSchema, estateContactSchema } from '../../utils/validation';
import {
  FlyoverWelcomeStep,
  FlyoverBrandStep,
  FlyoverContactStep,
  FlyoverTwilioStep,
  FlyoverVoiceStep,
  FlyoverHoursStep,
  FlyoverImportStep,
  FlyoverCompleteStep,
  VOICES,
  PROMPT_TEMPLATES,
} from './flyover';

// Storage key for flyover progress
const FLYOVER_STORAGE_KEY = 'merxus_estate_flyover_state';

// CSV sample data
const SAMPLE_CSV_CONTENT = `Address,Price,Beds,Baths,Sqft,Description
"123 Main St, Bakersfield, CA 93312",450000,3,2,1850,"Beautiful single-story home with updated kitchen and spacious backyard."
"456 Oak Ave, Bakersfield, CA 93314",525000,4,3,2200,"Stunning two-story home in gated community with pool and spa."
"789 Elm Dr, Bakersfield, CA 93311",375000,2,2,1400,"Charming starter home with new flooring and fresh paint throughout."`;

const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '14:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true },
};

const LISTING_COLUMN_ALIASES = {
  address: ['address', 'street', 'street address'],
  city: ['city'],
  state: ['state'],
  zipCode: ['zip', 'zipcode', 'zip code', 'postal code', 'postal'],
  price: ['price', 'list price', 'asking price'],
  sqft: ['sqft', 'sq ft', 'square feet', 'square footage', 'sqfeet'],
  bedrooms: ['beds', 'bedrooms', 'bed', 'br'],
  bathrooms: ['baths', 'bathrooms', 'bath', 'ba'],
  propertyType: ['property type', 'type', 'property_type', 'propertytype'],
  status: ['status', 'listing status'],
  lotSize: ['lotsize', 'lot size', 'lot sq ft', 'lot sqft', 'acreage', 'acres'],
  mlsNumber: ['mls', 'mls number', 'mls#', 'mlsnumber', 'mls_number'],
  yearBuilt: ['year built', 'yearbuilt', 'year_built', 'built'],
  description: ['description', 'notes', 'remarks', 'features', 'comments'],
};

const PROPERTY_TYPE_MAP = {
  'single family': 'Single Family',
  single_family: 'Single Family',
  singlefamily: 'Single Family',
  sfh: 'Single Family',
  condo: 'Condo',
  condominium: 'Condo',
  townhouse: 'Townhouse',
  townhome: 'Townhouse',
  'multi family': 'Multi-Family',
  'multi-family': 'Multi-Family',
  multifamily: 'Multi-Family',
};

const STATUS_MAP = {
  active: 'active',
  'for sale': 'active',
  pending: 'pending',
  'under contract': 'pending',
  sold: 'sold',
  closed: 'sold',
};

const normalizeBusinessHours = (input) => {
  const hours = input && typeof input === 'object' ? input : {};
  return Object.keys(DEFAULT_BUSINESS_HOURS).reduce((acc, day) => {
    const dayHours = hours[day] || {};
    acc[day] = {
      open: dayHours.open ?? DEFAULT_BUSINESS_HOURS[day].open,
      close: dayHours.close ?? DEFAULT_BUSINESS_HOURS[day].close,
      closed: typeof dayHours.closed === 'boolean' ? dayHours.closed : DEFAULT_BUSINESS_HOURS[day].closed,
    };
    return acc;
  }, {});
};

const firstFilledString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

const resolveListingColumnIndices = (headers) =>
  Object.entries(LISTING_COLUMN_ALIASES).reduce((acc, [key, aliases]) => {
    const match = headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
    if (match !== -1) {
      acc[key] = match;
    }
    return acc;
  }, {});

const parseCombinedAddress = (rawAddress) => {
  const value = String(rawAddress || '').trim();
  if (!value) {
    return { address: '', city: '', state: '', zipCode: '' };
  }

  const segments = value.split(',').map((segment) => segment.trim()).filter(Boolean);
  const [address = value, city = '', stateZip = ''] = segments;
  const stateZipParts = stateZip.split(/\s+/).filter(Boolean);

  return {
    address,
    city,
    state: stateZipParts[0] || '',
    zipCode: stateZipParts.slice(1).join(' '),
  };
};

const parseNumber = (value, allowDecimal = false) => {
  const cleaned = String(value || '').replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
  if (!cleaned) return 0;
  return allowDecimal ? parseFloat(cleaned) || 0 : parseInt(cleaned, 10) || 0;
};

const buildListingFromRow = (row, columnIndices) => {
  const getValue = (key) => {
    const index = columnIndices[key];
    return index === undefined ? '' : String(row[index] ?? '').trim();
  };

  const rawAddress = getValue('address');
  const rawCity = getValue('city');
  const parsedAddress = rawCity ? null : parseCombinedAddress(rawAddress);

  const address = rawCity ? rawAddress : parsedAddress?.address || '';
  const city = rawCity || parsedAddress?.city || '';
  const state = getValue('state') || parsedAddress?.state || '';
  const zipCode = getValue('zipCode') || parsedAddress?.zipCode || '';

  if (!address || !city) {
    return null;
  }

  const propertyTypeKey = getValue('propertyType').toLowerCase();
  const statusKey = getValue('status').toLowerCase();
  const lotSizeRaw = getValue('lotSize');

  const listing = {
    address,
    city,
    state,
    zipCode,
    price: parseNumber(getValue('price'), true),
    sqft: parseNumber(getValue('sqft')),
    bedrooms: parseNumber(getValue('bedrooms')),
    bathrooms: parseNumber(getValue('bathrooms'), true),
    propertyType: PROPERTY_TYPE_MAP[propertyTypeKey] || 'Single Family',
    status: STATUS_MAP[statusKey] || 'active',
    mlsNumber: getValue('mlsNumber'),
    yearBuilt: getValue('yearBuilt'),
    description: getValue('description'),
  };

  if (lotSizeRaw) {
    if (lotSizeRaw.toLowerCase().includes('acre')) {
      const acres = parseNumber(lotSizeRaw, true);
      if (acres) {
        listing.lotSize = `${acres} acres`;
      }
    } else {
      const lotSize = parseNumber(lotSizeRaw);
      if (lotSize) {
        listing.lotSize = `${lotSize} sqft`;
      }
    }
  }

  return listing;
};

const parseListingRows = (rows) => {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('Your file must include a header row and at least one listing.');
  }

  const headers = rows[0].map((header) => String(header || '').trim().toLowerCase());
  const columnIndices = resolveListingColumnIndices(headers);

  if (columnIndices.address === undefined) {
    throw new Error('Missing required Address column.');
  }

  const listings = rows
    .slice(1)
    .map((row) => buildListingFromRow(row, columnIndices))
    .filter(Boolean);

  if (listings.length === 0) {
    throw new Error('No valid listings were found in the file.');
  }

  return listings;
};

const parseListingsFromFile = async (file) => {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    const rows = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parseCsvLine(line));
    return parseListingRows(rows);
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    return parseListingRows(rows);
  }

  throw new Error('Please select a CSV or Excel file (.csv, .xlsx, .xls).');
};

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
  const flyoverStorageKey = agentId
    ? `${FLYOVER_STORAGE_KEY}:${agentId}`
    : FLYOVER_STORAGE_KEY;
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [importingListings, setImportingListings] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
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
    businessHours: DEFAULT_BUSINESS_HOURS,
  });

  // Load saved progress and settings
  useEffect(() => {
    if (isOpen) {
      loadState();
    }
  }, [isOpen, agentId]);

  const loadState = async () => {
    setLoading(true);
    try {
      // Load settings from API
      const data = await fetchEstateSettings();
      setSettings(data);

      // Load saved flyover progress from localStorage
      const savedState = localStorage.getItem(flyoverStorageKey);
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

      const normalizedHours = normalizeBusinessHours(
        savedFormData.businessHours ?? data.businessHours ?? formData.businessHours
      );

      setFormData({
        name: savedFormData.name ?? data.name ?? '',
        brandName: savedFormData.brandName ?? data.brandName ?? '',
        brokerage: savedFormData.brokerage ?? data.brokerage ?? '',
        licenseNumber: savedFormData.licenseNumber ?? data.licenseNumber ?? '',
        address: savedFormData.address ?? data.address ?? '',
        phonePrimary: firstFilledString(savedFormData.phonePrimary, data.phonePrimary, data.phoneNumber),
        websiteUrl: savedFormData.websiteUrl ?? data.websiteUrl ?? '',
        markets: savedFormData.markets ?? (Array.isArray(data.markets) ? data.markets.join(', ') : data.markets ?? ''),
        twilioPhoneNumber: savedFormData.twilioPhoneNumber ?? data.twilioPhoneNumber ?? '',
        twilioNumberSid: savedFormData.twilioNumberSid ?? data.twilioNumberSid ?? '',
        aiVoice: savedFormData.aiVoice ?? data.aiConfig?.voiceName ?? 'alloy',
        promptTemplate: savedFormData.promptTemplate ?? matchedTemplate,
        customInstructions: hasExistingInstructions ? existingInstructions : PROMPT_TEMPLATES[0].prompt,
        businessHours: normalizedHours,
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
    localStorage.setItem(flyoverStorageKey, JSON.stringify(state));
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

  const handleCopyMondayToAll = () => {
    const mondayHours = formData.businessHours?.monday || DEFAULT_BUSINESS_HOURS.monday;
    const copiedHours = Object.keys(DEFAULT_BUSINESS_HOURS).reduce((acc, day) => {
      acc[day] = day === 'monday' ? mondayHours : { ...mondayHours };
      return acc;
    }, {});
    handleChange('businessHours', copiedHours);
    toast.success('Monday hours copied to the rest of the week.');
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

  // Validate current step before moving to next
  const validateStep = (step) => {
    setValidationErrors({});
    
    switch (step) {
      case 1: // Brand step
        const brandResult = validateForm(estateBrandSchema, {
          agentName: formData.name,
          brokerageName: formData.brokerage,
          licenseNumber: formData.licenseNumber,
        });
        if (!brandResult.success) {
          // Map validation errors to form fields
          const errors = {};
          if (brandResult.errors?.agentName) errors.name = brandResult.errors.agentName;
          if (brandResult.errors?.brokerageName) errors.brokerage = brandResult.errors.brokerageName;
          setValidationErrors(errors);
          return false;
        }
        return true;
        
      case 2: // Contact step
        const contactResult = validateForm(estateContactSchema, {
          email: formData.email || settings?.email || '',
          phoneNumber: formData.phonePrimary,
          websiteUrl: formData.websiteUrl,
        });
        if (!contactResult.success) {
          const errors = {};
          if (contactResult.errors?.email) errors.email = contactResult.errors.email;
          if (contactResult.errors?.phoneNumber) errors.phonePrimary = contactResult.errors.phoneNumber;
          if (contactResult.errors?.websiteUrl) errors.websiteUrl = contactResult.errors.websiteUrl;
          setValidationErrors(errors);
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  // Navigation
  const goToStep = (step) => {
    setCurrentStep(step);
    setValidationErrors({});
    saveProgress(step, formData);
  };

  const nextStep = async () => {
    // Validate current step
    if (!validateStep(currentStep)) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    
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

    setImportingListings(true);
    setImportSummary(null);
    const toastId = toast.loading(`Importing listings from ${file.name}...`);

    try {
      const listings = await parseListingsFromFile(file);
      let imported = 0;
      let failed = 0;

      for (const listing of listings) {
        try {
          await createListing(listing);
          imported += 1;
        } catch (error) {
          failed += 1;
          console.error('Failed to import listing:', listing.address, error);
        }
      }

      const summary = { fileName: file.name, imported, failed };
      setImportSummary(summary);

      if (imported === 0) {
        throw new Error('No listings were imported. Please review the file and try again.');
      }

      toast.dismiss(toastId);
      toast.success(
        failed > 0
          ? `Imported ${imported} listings. ${failed} could not be imported.`
          : `Imported ${imported} listings successfully.`
      );
    } catch (error) {
      console.error('Listing import failed:', error);
      toast.dismiss(toastId);
      toast.error(error.message || 'Failed to import listings.');
    } finally {
      setImportingListings(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Complete the flyover
  const handleComplete = async () => {
    await saveStepData();
    localStorage.removeItem(flyoverStorageKey);
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
          {currentStep === 0 && <FlyoverWelcomeStep />}
          {currentStep === 1 && (
            <FlyoverBrandStep
              formData={formData}
              validationErrors={validationErrors}
              onChange={handleChange}
            />
          )}
          {currentStep === 2 && (
            <FlyoverContactStep
              formData={formData}
              validationErrors={validationErrors}
              onChange={handleChange}
              onPhoneChange={handlePhoneChange}
            />
          )}
          {currentStep === 3 && (
            <FlyoverTwilioStep
              formData={formData}
              onChange={handleChange}
              onRequestTwilioInfo={handleRequestTwilioInfo}
              isLocked={!!formData.twilioPhoneNumber}
            />
          )}
          {currentStep === 4 && (
            <FlyoverVoiceStep
              formData={formData}
              playingVoice={playingVoice}
              onChange={handleChange}
              onPlayVoice={handlePlayVoice}
            />
          )}
          {currentStep === 5 && (
            <FlyoverHoursStep
              formData={formData}
              onHoursChange={handleHoursChange}
              onCopyMondayToAll={handleCopyMondayToAll}
            />
          )}
          {currentStep === 6 && (
            <FlyoverImportStep
              fileInputRef={fileInputRef}
              onDownloadTemplate={handleDownloadTemplate}
              onFileUpload={handleFileUpload}
              importing={importingListings}
              importSummary={importSummary}
            />
          )}
          {currentStep === 7 && <FlyoverCompleteStep />}
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
