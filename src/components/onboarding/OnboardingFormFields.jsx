/**
 * Reusable form field components for onboarding
 */
import { Link } from 'react-router-dom';

const BUSINESS_TYPE_OPTIONS = [
  'Law Firm',
  'Medical Office',
  'Dental Office',
  'Consulting',
  'Accounting / Tax',
  'Real Estate Brokerage',
  'Insurance',
  'Financial Services',
  'Automotive',
  'Retail',
  'E-Commerce',
  'Manufacturing',
  'Logistics',
  'Hospitality',
  'Education',
  'Nonprofits',
  'Government',
  'Other',
];

/**
 * Common text input field
 */
export function FormInput({
  id,
  name,
  type = 'text',
  label,
  required = false,
  value,
  onChange,
  placeholder,
  helpText,
  ...props
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && '*'}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        className="input-field"
        placeholder={placeholder}
        {...props}
      />
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

/**
 * Textarea field
 */
export function FormTextarea({
  id,
  name,
  label,
  required = false,
  value,
  onChange,
  placeholder,
  helpText,
  rows = 3,
  ...props
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && '*'}
      </label>
      <textarea
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        rows={rows}
        className="input-field"
        placeholder={placeholder}
        {...props}
      />
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

/**
 * Selected plan display box
 */
export function PlanDisplay({ pricingInfo, selectedPlan }) {
  if (selectedPlan) {
    return (
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
    );
  }

  return (
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
  );
}

/**
 * Owner/Manager information section
 */
export function OwnerInfoSection({ formData, onChange, showSection = true }) {
  if (!showSection) return null;

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Owner/Manager Information
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        We'll send an invitation email to set up your account password.
      </p>
      
      <div className="space-y-4">
        <FormInput
          id="ownerName"
          name="ownerName"
          label="Full Name"
          required
          value={formData.ownerName}
          onChange={onChange}
          placeholder="Enter your full name"
        />
        <FormInput
          id="ownerEmail"
          name="ownerEmail"
          type="email"
          label="Email Address"
          required
          value={formData.ownerEmail}
          onChange={onChange}
          placeholder="your.email@example.com"
          helpText="We'll send a password setup link to this email"
        />
      </div>
    </div>
  );
}

/**
 * Restaurant-specific fields
 */
export function RestaurantFields({ formData, onChange }) {
  return (
    <>
      <FormInput
        id="cuisineType"
        name="cuisineType"
        label="Type of Cuisine"
        required
        value={formData.cuisineType}
        onChange={onChange}
        placeholder="e.g., Italian, Mexican, American"
      />
      <FormTextarea
        id="description"
        name="description"
        label="Restaurant Description (1-2 sentences)"
        required
        value={formData.description}
        onChange={onChange}
        placeholder="A brief description of your restaurant for greeting personalization"
      />
    </>
  );
}

/**
 * Voice/Office-specific fields
 */
export function VoiceFields({ formData, onChange }) {
  return (
    <div>
      <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
        Business Type *
      </label>
      <select
        id="businessType"
        name="businessType"
        required
        value={formData.businessType}
        onChange={onChange}
        className="input-field"
      >
        <option value="">Select business type...</option>
        {BUSINESS_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">This helps the AI match your business context.</p>
    </div>
  );
}

/**
 * Real Estate-specific fields
 */
export function RealEstateFields({ formData, onChange }) {
  return (
    <>
      <FormInput
        id="brandName"
        name="brandName"
        label="Brand Name (Optional)"
        value={formData.brandName}
        onChange={onChange}
        placeholder="e.g., The Jake Smith Team, Smith Realty Group"
        helpText={'If left blank, will default to "[Your Name] Team"'}
      />
      <FormInput
        id="brokerage"
        name="brokerage"
        label="Brokerage (Optional)"
        value={formData.brokerage}
        onChange={onChange}
        placeholder="e.g., Keller Williams, RE/MAX, Coldwell Banker"
      />
      <FormInput
        id="licenseNumber"
        name="licenseNumber"
        label="License Number (Optional)"
        value={formData.licenseNumber}
        onChange={onChange}
        placeholder="e.g., CA-123456"
      />
      <FormTextarea
        id="markets"
        name="markets"
        label="Markets Served"
        value={formData.markets}
        onChange={onChange}
        placeholder={'Enter cities, zip codes, or areas (one per line or comma-separated)\ne.g., Bakersfield, CA\n93312\n93314'}
        helpText="List the areas you serve. This helps the AI answer location-specific questions."
      />
    </>
  );
}

/**
 * Error display
 */
export function FormError({ error }) {
  if (!error) return null;
  
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  );
}

/**
 * Submit button with pricing terms
 */
export function SubmitButton({ loading, disabled, pricingInfo, selectedPlan }) {
  return (
    <div className="pt-4">
      <button 
        type="submit" 
        className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading || disabled}
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
  );
}
