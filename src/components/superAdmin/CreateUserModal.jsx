import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

export default function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phoneNumber: '',
    tenantType: 'restaurant', // restaurant, voice, real_estate
    role: 'owner',
    // Tenant IDs (optional - will be generated if not provided)
    restaurantId: '',
    officeId: '',
    agentId: '',
    // Twilio config
    twilioNumber: '',
    twilioSid: '',
    // Additional info
    companyName: '',
    brokerage: '',
  });

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return true; // Optional field
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Must start with + or digit, and be 10-15 digits total
    const phoneRegex = /^\+?\d{10,15}$/;
    return phoneRegex.test(cleaned);
  };

  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case 'email':
        if (!value) {
          errors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          errors.email = 'Invalid email format';
        } else {
          delete errors.email;
        }
        break;
      
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else {
          delete errors.password;
        }
        // Re-validate confirm password if it exists
        if (formData.confirmPassword) {
          if (value !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
          } else {
            delete errors.confirmPassword;
          }
        }
        break;
      
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm password';
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
      
      case 'phoneNumber':
        if (value && !validatePhoneNumber(value)) {
          errors.phoneNumber = 'Invalid phone format (10-15 digits, optional +)';
        } else {
          delete errors.phoneNumber;
        }
        break;
      
      default:
        break;
    }

    setValidationErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
    setError('');
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.email &&
      validateEmail(formData.email) &&
      formData.password &&
      formData.password.length >= 6 &&
      formData.confirmPassword &&
      formData.password === formData.confirmPassword &&
      (!formData.phoneNumber || validatePhoneNumber(formData.phoneNumber)) &&
      Object.keys(validationErrors).length === 0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Call parent's onSuccess handler
      await onSuccess(formData);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        phoneNumber: '',
        tenantType: 'restaurant',
        role: 'owner',
        restaurantId: '',
        officeId: '',
        agentId: '',
        twilioNumber: '',
        twilioSid: '',
        companyName: '',
        brokerage: '',
      });
      setValidationErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Reset validation when modal closes
  const handleClose = () => {
    setValidationErrors({});
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">Create New User</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" autoComplete="off">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className={`input-field ${validationErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="user@example.com"
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  autoComplete="off"
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className={`input-field pr-10 ${validationErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className={`input-field pr-10 ${validationErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`input-field ${validationErrors.phoneNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="+16661234567"
                />
                <p className="mt-1 text-xs text-gray-500">Personal/business contact phone (not Twilio)</p>
                {validationErrors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tenant Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant Type *
                </label>
                <select
                  name="tenantType"
                  value={formData.tenantType}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="voice">Voice (Small Business)</option>
                  <option value="real_estate">Real Estate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name / Brokerage
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Company or brokerage name"
                />
              </div>

              {formData.tenantType === 'real_estate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brokerage (Real Estate)
                  </label>
                  <input
                    type="text"
                    name="brokerage"
                    value={formData.brokerage}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Brokerage name"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Twilio Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Twilio Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twilio Phone Number
                </label>
                <input
                  type="tel"
                  name="twilioNumber"
                  value={formData.twilioNumber}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+16667778888"
                />
                <p className="mt-1 text-xs text-gray-500">Business Twilio phone for AI calls</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twilio Number SID
                </label>
                <input
                  type="text"
                  name="twilioSid"
                  value={formData.twilioSid}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="mt-1 text-xs text-gray-500">From Twilio Console (starts with PN)</p>
              </div>
            </div>
          </div>

          {/* Advanced: Tenant IDs (optional) */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-medium text-gray-700">
              Advanced: Specify Tenant IDs (optional)
            </summary>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.tenantType === 'restaurant' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant ID
                  </label>
                  <input
                    type="text"
                    name="restaurantId"
                    value={formData.restaurantId}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              )}

              {formData.tenantType === 'voice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Office ID
                  </label>
                  <input
                    type="text"
                    name="officeId"
                    value={formData.officeId}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              )}

              {formData.tenantType === 'real_estate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent ID
                  </label>
                  <input
                    type="text"
                    name="agentId"
                    value={formData.agentId}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              )}
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-primary ${!isFormValid() || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isFormValid() || loading}
              title={!isFormValid() ? 'Please complete all required fields correctly' : ''}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
