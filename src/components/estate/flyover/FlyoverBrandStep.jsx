export default function FlyoverBrandStep({ formData, validationErrors, onChange }) {
  return (
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
          onChange={(e) => onChange('name', e.target.value)}
          className={`input-field ${validationErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="e.g., Jake Smith"
        />
        {validationErrors.name && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brand Name
        </label>
        <input
          type="text"
          value={formData.brandName}
          onChange={(e) => onChange('brandName', e.target.value)}
          className={`input-field ${validationErrors.brandName ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="e.g., The Jake Smith Team"
        />
        {validationErrors.brandName && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.brandName}</p>
        )}
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
          onChange={(e) => onChange('brokerage', e.target.value)}
          className={`input-field ${validationErrors.brokerage ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="e.g., Keller Williams, RE/MAX"
        />
        {validationErrors.brokerage && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.brokerage}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          License Number
        </label>
        <input
          type="text"
          value={formData.licenseNumber}
          onChange={(e) => onChange('licenseNumber', e.target.value)}
          className="input-field"
          placeholder="e.g., CA-123456"
        />
      </div>
    </div>
  );
}
