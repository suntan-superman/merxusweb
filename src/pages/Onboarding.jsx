import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import InvitationLinkModal from '../components/common/InvitationLinkModal';

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantType = searchParams.get('type') || 'restaurant'; // Default to restaurant for backward compatibility
  const selectedPlan = searchParams.get('plan') || null; // Plan from pricing page
  const isVoice = tenantType === 'voice';
  const isRealEstate = tenantType === 'real_estate';

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    websiteUrl: '',
    // Owner/Manager info (required for both)
    ownerEmail: '',
    ownerName: '',
    // Restaurant-specific fields
    cuisineType: '',
    description: '',
    // Voice-specific fields
    businessType: '',
    // Real Estate-specific fields
    brandName: '',
    brokerage: '',
    licenseNumber: '',
    markets: '',
    // Plan selection (from pricing page)
    selectedPlan: selectedPlan || null,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationData, setInvitationData] = useState(null);

  // Pricing information based on tenant type and plan
  const getPricingInfo = () => {
    if (isRealEstate) {
      if (selectedPlan === 'basic') {
        return { monthly: 49, setup: 49, planName: 'Basic' };
      } else if (selectedPlan === 'professional') {
        return { monthly: 79, setup: 99, planName: 'Professional' };
      }
      return { monthly: 49, setup: 49, planName: 'Basic' }; // Default
    } else if (isVoice) {
      if (selectedPlan === 'basic') {
        return { monthly: 49, setup: 49, planName: 'Basic' };
      } else if (selectedPlan === 'professional') {
        return { monthly: 99, setup: 149, planName: 'Professional' };
      } else if (selectedPlan === 'enterprise') {
        return { monthly: 199, setup: 249, planName: 'Enterprise' };
      }
      return { monthly: 49, setup: 49, planName: 'Basic' }; // Default
    } else {
      // Restaurant
      if (selectedPlan === 'basic') {
        return { monthly: 199, setup: 299, planName: 'Basic' };
      } else if (selectedPlan === 'enterprise') {
        return { monthly: 499, setup: 999, planName: 'Enterprise' };
      }
      return { monthly: 199, setup: 299, planName: 'Basic' }; // Default
    }
  };

  const pricingInfo = getPricingInfo();

  // Scroll to top when component mounts or tenant type changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tenantType]);

  // Check if all required fields are filled (except websiteUrl)
  const isFormValid = () => {
    const requiredFields = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      ownerEmail: formData.ownerEmail.trim(),
      ownerName: formData.ownerName.trim(),
    };

    // Add tenant-specific required fields
    if (isRealEstate) {
      // Real estate requires agent name (name field) and owner info
      // Brand name is optional (defaults to "[Name] Team")
    } else if (!isVoice) {
      // Restaurant requires cuisine type and description
      requiredFields.cuisineType = formData.cuisineType.trim();
      requiredFields.description = formData.description.trim();
    }

    // Check if all required fields are filled
    return Object.values(requiredFields).every(value => value.length > 0);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      
      // Import API function dynamically based on tenant type
      if (isRealEstate) {
        const { apiClient } = await import('../api/client');
        
        // Parse markets (comma-separated or newline-separated)
        const marketsArray = formData.markets
          .split(/[,\n]/)
          .map(m => m.trim())
          .filter(m => m.length > 0);
        
        // Default brand name to "[Name] Team" if not provided
        const brandName = formData.brandName.trim() || `${formData.name} Team`;
        
        const res = await apiClient.post('/onboarding/agent', {
          agent: {
            name: formData.name,
            brandName: brandName,
            email: formData.ownerEmail,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            websiteUrl: formData.websiteUrl,
            brokerage: formData.brokerage.trim() || null,
            licenseNumber: formData.licenseNumber.trim() || null,
            markets: marketsArray,
            timezone: 'America/Los_Angeles', // Default, can be made configurable later
          },
          owner: {
            email: formData.ownerEmail,
            displayName: formData.ownerName,
            role: 'owner',
          },
          plan: formData.selectedPlan, // Pass selected plan to backend
        });
        const result = res.data;
        
        // Verify user was created
        if (!result.userCreated) {
          throw new Error('User account was not created. Please contact support.');
        }
        
        // Priority: Firebase Auth first, then SendGrid as backup
        let emailSent = false;
        let emailService = 'Firebase Auth';
        
        // Try Firebase Auth first
        try {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          const { auth } = await import('../firebase/config');
          await sendPasswordResetEmail(auth, formData.ownerEmail, {
            url: `${window.location.origin}/login?mode=resetPassword&agentId=${result.agentId}`,
            handleCodeInApp: false,
          });
          emailSent = true;
        } catch (firebaseEmailError) {
          // If Firebase Auth fails, try SendGrid as backup
          if (result.emailSent) {
            emailSent = true;
            emailService = 'SendGrid';
          }
        }
        
        if (emailSent) {
          navigate('/login', { 
            state: { 
              message: 'Agent account created successfully! Please check your email to set your password.',
              email: formData.ownerEmail 
            } 
          });
        } else {
          // Neither SendGrid nor Firebase Auth worked - show the invitation link modal
          setInvitationData({
            link: result.invitationLink,
            email: formData.ownerEmail,
            tenantType: 'real_estate'
          });
          setShowInvitationModal(true);
        }
      } else if (isVoice) {
        const { createOffice } = await import('../api/voice');
        
        const result = await createOffice({
          office: {
            name: formData.name,
            email: formData.ownerEmail, // Use owner email as contact email
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            websiteUrl: formData.websiteUrl,
            businessType: formData.businessType,
            timezone: 'America/Los_Angeles', // Default, can be made configurable later
          },
          owner: {
            email: formData.ownerEmail,
            displayName: formData.ownerName,
            role: 'owner',
          },
          plan: formData.selectedPlan, // Pass selected plan to backend
        });
        
        console.log('Office creation result:', result);
        
        // Verify user was created
        if (!result || !result.userCreated) {
          console.error('User was not created. Result:', result);
          throw new Error('User account was not created. Please contact support.');
        }
        
        // Priority: Firebase Auth first (built-in, reliable), then SendGrid as backup (for formatted emails)
        let emailSent = false;
        let emailService = 'Firebase Auth';
        
        // Try Firebase Auth first
        try {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          const { auth } = await import('../firebase/config');
          await sendPasswordResetEmail(auth, formData.ownerEmail, {
            url: `${window.location.origin}/login?mode=resetPassword&officeId=${result.officeId}`,
            handleCodeInApp: false,
          });
          emailSent = true;
        } catch (firebaseEmailError) {
          // If Firebase Auth fails, try SendGrid as backup
          if (result.emailSent) {
            emailSent = true;
            emailService = 'SendGrid';
          }
        }
        
        if (emailSent) {
          navigate('/login', { 
            state: { 
              message: 'Office created successfully! Please check your email to set your password.',
              email: formData.ownerEmail 
            } 
          });
        } else {
          // Neither SendGrid nor Firebase Auth worked - show the invitation link modal
          setInvitationData({
            link: result.invitationLink,
            email: formData.ownerEmail,
            tenantType: 'voice'
          });
          setShowInvitationModal(true);
        }
      } else {
        // Use public onboarding endpoint for restaurants
        const { apiClient } = await import('../api/client');
        const res = await apiClient.post('/onboarding/restaurant', {
          restaurant: {
            name: formData.name,
            email: formData.ownerEmail, // Use owner email as contact email
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            websiteUrl: formData.websiteUrl,
            cuisineType: formData.cuisineType,
            description: formData.description,
            timezone: 'America/Los_Angeles', // Default, can be made configurable later
          },
          manager: {
            email: formData.ownerEmail,
            displayName: formData.ownerName,
            role: 'owner',
          },
          plan: formData.selectedPlan, // Pass selected plan to backend
        });
        const result = res.data;
        
        // Verify user was created
        if (!result.userCreated) {
          throw new Error('User account was not created. Please contact support.');
        }
        
        // Priority: Firebase Auth first (built-in, reliable), then SendGrid as backup (for formatted emails)
        let emailSent = false;
        let emailService = 'Firebase Auth';
        
        // Try Firebase Auth first
        try {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          const { auth } = await import('../firebase/config');
          await sendPasswordResetEmail(auth, formData.ownerEmail, {
            url: `${window.location.origin}/login?mode=resetPassword&restaurantId=${result.restaurantId}`,
            handleCodeInApp: false,
          });
          emailSent = true;
        } catch (firebaseEmailError) {
          // If Firebase Auth fails, try SendGrid as backup
          if (result.emailSent) {
            emailSent = true;
            emailService = 'SendGrid';
          }
        }
        
        if (emailSent) {
          navigate('/login', { 
            state: { 
              message: 'Restaurant created successfully! Please check your email to set your password.',
              email: formData.ownerEmail 
            } 
          });
        } else {
          // Neither SendGrid nor Firebase Auth worked - show the invitation link modal
          setInvitationData({
            link: result.invitationLink,
            email: formData.ownerEmail,
            tenantType: 'restaurant'
          });
          setShowInvitationModal(true);
        }
      }
    } catch (err) {
      console.error('Error creating business:', err);
      console.error('Error details:', {
        message: err?.message,
        response: err?.response,
        responseData: err?.response?.data,
        originalError: err?.originalError
      });
      
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to create business. Please try again.';
      
      // Show error in UI
      setError(errorMessage);
      
      // Show toast notification
      toast.error(errorMessage);
      
      // If it's a user creation error, provide more specific guidance
      if (errorMessage.includes('user') || errorMessage.includes('email')) {
        setError(`${errorMessage} Please verify your email address is correct and try again, or contact support.`);
      }
      
      // Don't redirect on error - keep user on form
      setLoading(false);
      return;
    }
  };

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-br from-primary-50 to-white min-h-screen">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get Started with {isRealEstate ? 'Merxus Real Estate' : isVoice ? 'Merxus Voice' : 'Merxus'}
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            {isRealEstate
              ? 'Fill out your agent information to begin'
              : isVoice
              ? 'Fill out your business information to begin'
              : 'Fill out your restaurant information to begin'}
          </p>
          
          {/* Selected Plan Display */}
          {selectedPlan ? (
            <div className="inline-block px-6 py-3 mb-4 bg-primary-50 border-2 border-primary-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Selected Plan</p>
              <p className="text-lg font-semibold text-primary-700">
                {pricingInfo.planName} - ${pricingInfo.monthly}/month
              </p>
              <p className="text-sm text-gray-600">
                Setup Fee: ${pricingInfo.setup} one-time
              </p>
              <Link 
                to="/pricing" 
                className="text-xs text-primary-600 hover:text-primary-700 underline mt-1 inline-block"
              >
                Change plan
              </Link>
            </div>
          ) : (
            <div className="inline-block px-6 py-3 mb-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">No plan selected.</span> You can choose a plan after your trial.
              </p>
              <Link 
                to="/pricing" 
                className="text-sm text-primary-600 hover:text-primary-700 underline font-semibold"
              >
                View pricing plans →
              </Link>
            </div>
          )}
          
          {/* Trial Information */}
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-primary-600">30-day free trial</span> • Setup fee charged upfront
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {isRealEstate ? 'Agent Name' : isVoice ? 'Business Name' : 'Restaurant Name'} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder={isRealEstate ? 'Enter your name (e.g., Jake Smith)' : isVoice ? 'Enter your business name' : 'Enter your restaurant name'}
            />
            {isRealEstate && (
              <p className="mt-1 text-sm text-gray-500">
                This will be used as your professional name (e.g., "The Jake Smith Team")
              </p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <input
              type="text"
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="input-field"
              placeholder={isVoice ? 'Enter your business address' : 'Enter your restaurant address'}
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="input-field"
              placeholder="(555) 123-4567"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional - Your contact number in case we need to reach you. The phone number for receiving calls will be configured when you set up your Twilio service.
            </p>
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              id="websiteUrl"
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleChange}
              className="input-field"
              placeholder={isVoice ? 'https://yourbusiness.com' : 'https://yourrestaurant.com'}
            />
          </div>

          {/* Restaurant-specific fields */}
          {!isVoice && !isRealEstate && (
            <>
              <div>
                <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Cuisine *
                </label>
                <input
                  type="text"
                  id="cuisineType"
                  name="cuisineType"
                  required
                  value={formData.cuisineType}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Italian, Mexican, American"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Description (1-2 sentences) *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="input-field"
                  placeholder="A brief description of your restaurant for greeting personalization"
                />
              </div>
            </>
          )}

          {/* Voice-specific fields */}
          {isVoice && (
            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <input
                type="text"
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Law Firm, Medical Practice, Real Estate"
              />
              <p className="text-xs text-gray-500 mt-1">
                This helps the AI understand your business context
              </p>
            </div>
          )}

          {/* Real Estate-specific fields */}
          {isRealEstate && (
            <>
              <div>
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name (Optional)
                </label>
                <input
                  type="text"
                  id="brandName"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., The Jake Smith Team, Smith Realty Group"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If left blank, will default to "[Your Name] Team"
                </p>
              </div>

              <div>
                <label htmlFor="brokerage" className="block text-sm font-medium text-gray-700 mb-2">
                  Brokerage (Optional)
                </label>
                <input
                  type="text"
                  id="brokerage"
                  name="brokerage"
                  value={formData.brokerage}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Keller Williams, RE/MAX, Coldwell Banker"
                />
              </div>

              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  License Number (Optional)
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., CA-123456"
                />
              </div>

              <div>
                <label htmlFor="markets" className="block text-sm font-medium text-gray-700 mb-2">
                  Markets Served
                </label>
                <textarea
                  id="markets"
                  name="markets"
                  value={formData.markets}
                  onChange={handleChange}
                  rows="3"
                  className="input-field"
                  placeholder="Enter cities, zip codes, or areas (one per line or comma-separated)&#10;e.g., Bakersfield, CA&#10;93312&#10;93314"
                />
                <p className="text-xs text-gray-500 mt-1">
                  List the areas you serve. This helps the AI answer location-specific questions.
                </p>
              </div>
            </>
          )}

          {/* Owner/Manager Information - Required for both */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Owner/Manager Information
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll send an invitation email to set up your account password.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="ownerName"
                  name="ownerName"
                  required
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="ownerEmail"
                  name="ownerEmail"
                  required
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll send a password setup link to this email
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !isFormValid()}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
            <p className="text-center text-sm text-gray-600 mt-4">
              By continuing, you agree to our{' '}
              <span className="font-semibold">30-day free trial</span>. 
              {selectedPlan && (
                <>
                  {' '}You'll pay a <span className="font-semibold">${pricingInfo.setup} setup fee</span> today.
                  {' '}After your trial, you'll be charged{' '}
                  <span className="font-semibold">${pricingInfo.monthly}/month</span>.
                </>
              )}
              {' '}Cancel anytime.
            </p>
          </div>
        </form>
      </div>

      {/* Invitation Link Modal */}
      <InvitationLinkModal
        isOpen={showInvitationModal}
        onClose={() => {
          setShowInvitationModal(false);
          // Navigate to login after closing
          navigate('/login', {
            state: {
              message: 'Account created successfully! Please use the password setup link to complete your registration.',
              email: invitationData?.email
            }
          });
        }}
        invitationLink={invitationData?.link}
        email={invitationData?.email}
        tenantType={invitationData?.tenantType}
      />
    </div>
  );
};

export default Onboarding;

