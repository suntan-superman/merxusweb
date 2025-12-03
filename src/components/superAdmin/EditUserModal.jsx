import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

export default function EditUserModal({ isOpen, onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    role: '',
    password: '',
    disabled: false,
  });

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || '',
        password: '',
        disabled: user.disabled || false,
      });
    }
  }, [isOpen, user]);

  // Validation functions
  const validatePhoneNumber = (phone) => {
    if (!phone) return true; // Optional field
    const cleaned = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?\d{10,15}$/;
    return phoneRegex.test(cleaned);
  };

  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case 'password':
        if (value && value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else {
          delete errors.password;
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
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (type !== 'checkbox') {
      validateField(name, value);
    }
    setError('');
  };

  const isFormValid = () => {
    return (
      (!formData.password || formData.password.length >= 6) &&
      (!formData.phoneNumber || validatePhoneNumber(formData.phoneNumber)) &&
      Object.keys(validationErrors).length === 0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isFormValid()) {
      setError('Please fix validation errors');
      return;
    }

    setLoading(true);
    try {
      // Build update object - only include fields that have values
      const updates = {
        displayName: formData.displayName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        role: formData.role || undefined,
        disabled: formData.disabled,
      };

      // Only include password if user entered one
      if (formData.password) {
        updates.password = formData.password;
      }

      await onSuccess(user.uid, updates);
      
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setValidationErrors({});
    setError('');
    setShowPassword(false);
    setFormData({
      displayName: '',
      phoneNumber: '',
      role: '',
      password: '',
      disabled: false,
    });
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Edit User</h2>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
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

          {/* User Info (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-900">{user.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">UID:</span>
                <span className="ml-2 text-xs text-gray-600 font-mono">{user.uid}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tenant Type:</span>
                <span className="ml-2 text-gray-900 capitalize">{user.tenantType || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-900">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-field"
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="agent">Agent</option>
                <option value="super_admin">Super Admin</option>
                <option value="merxus_admin">Merxus Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`input-field ${validationErrors.phoneNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="+16661234567"
              />
              {validationErrors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password (optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  data-lpignore="true"
                  className={`input-field pr-10 ${validationErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Leave blank to keep current"
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
          </div>

          {/* Account Status */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="disabled"
                name="disabled"
                checked={formData.disabled}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <div>
                <label htmlFor="disabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Disable this account
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  User will not be able to log in. Use this for cancelled subscriptions or non-payment.
                </p>
              </div>
            </div>
          </div>

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
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
