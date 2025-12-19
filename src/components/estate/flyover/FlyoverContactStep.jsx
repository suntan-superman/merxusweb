export default function FlyoverContactStep({ formData, validationErrors, onChange, onPhoneChange }) {
  return (
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
          onChange={(e) => onChange('address', e.target.value)}
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
          onChange={(e) => onPhoneChange('phonePrimary', e.target.value)}
          className={`input-field ${validationErrors.phonePrimary ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="(555) 123-4567"
        />
        {validationErrors.phonePrimary ? (
          <p className="text-red-500 text-xs mt-1">{validationErrors.phonePrimary}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Your direct contact number (not your Twilio AI number)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website
        </label>
        <input
          type="url"
          value={formData.websiteUrl}
          onChange={(e) => onChange('websiteUrl', e.target.value)}
          className={`input-field ${validationErrors.websiteUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="https://yourwebsite.com"
        />
        {validationErrors.websiteUrl && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.websiteUrl}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Markets Served
        </label>
        <textarea
          value={formData.markets}
          onChange={(e) => onChange('markets', e.target.value)}
          className="input-field resize-none"
          rows={3}
          placeholder="Bakersfield, CA&#10;93312, 93314&#10;Kern County"
        />
        <p className="text-xs text-gray-500 mt-1">
          List cities, zip codes, or areas (comma or line separated)
        </p>
      </div>
    </div>
  );
}
