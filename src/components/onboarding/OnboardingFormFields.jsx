/**
 * Reusable form field components for onboarding
 */
import { Link } from 'react-router-dom';
import SelectField from '../common/SelectField';

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
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{helpText}</p>
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
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{helpText}</p>
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
      <div className="mb-4 inline-block rounded-lg border-2 border-primary-200 bg-primary-50 px-6 py-3 dark:border-slate-600 dark:bg-slate-800">
        <p className="mb-1 text-sm text-gray-600 dark:text-slate-300">Selected Plan</p>
        <p className="text-lg font-semibold text-primary-700">
          {pricingInfo.planName} - ${pricingInfo.monthly}/month
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-300">
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
      <div className="mb-4 inline-block rounded-lg border-2 border-yellow-200 bg-yellow-50 px-6 py-3 dark:border-yellow-700/50 dark:bg-slate-800">
        <p className="mb-2 text-sm text-gray-700 dark:text-slate-300">
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
 * Account method selector (email/password setup or Apple Sign-In)
 */
export function AccountMethodSelector({
  authMethod = 'password',
  onChange,
  isAppleConnected = false,
  appleEmail = '',
  onAppleConnect,
  loading = false,
  disableEmailOption = false,
}) {
  const isAppleAuth = authMethod === 'apple';

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-100">Account Sign-In Method</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange?.('password')}
          disabled={disableEmailOption}
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
            !isAppleAuth
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
          } ${disableEmailOption ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => onChange?.('apple')}
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
            isAppleAuth
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          Apple
        </button>
      </div>

      {isAppleAuth && (
        <div className="mt-3 rounded-md border border-primary-100 bg-primary-50 px-3 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
          {isAppleConnected ? (
            <p className="text-primary-800">
              Apple connected as <span className="font-semibold">{appleEmail}</span>
            </p>
          ) : (
            <>
              <p className="text-primary-800 mb-2">Connect Apple Sign-In before creating your account.</p>
              <button
                type="button"
                onClick={onAppleConnect}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Connecting Apple...' : 'Continue with Apple'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Owner/Manager information section
 */
export function OwnerInfoSection({
  formData,
  onChange,
  showSection = true,
  emailReadOnly = false,
  introText = "We'll send an invitation email to set up your account password.",
  emailHelpText = "We'll send a password setup link to this email",
}) {
  if (!showSection) return null;

  return (
    <div className="border-t border-gray-200 pt-6 dark:border-slate-700">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
        Owner/Manager Information
      </h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
        {introText}
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
          helpText={emailHelpText}
          readOnly={emailReadOnly}
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
      <label htmlFor="businessType" className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
        Business Type *
      </label>
      <SelectField
        id="businessType"
        name="businessType"
        value={formData.businessType}
        onChange={(nextValue) => onChange({ target: { name: 'businessType', value: nextValue } })}
        options={BUSINESS_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
        placeholder="Select business type..."
        required
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">This helps the AI match your business context.</p>
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
