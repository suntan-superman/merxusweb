import { MapPin, Mail, Phone, Globe, Clock } from 'lucide-react';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

export default function BusinessDetails({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Tell Us About Your Business</h3>
        <p className="text-gray-600">We'll use this to personalize your AI assistant</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.businessName || ''}
            onChange={(e) => handleChange('businessName', e.target.value)}
            placeholder="Acme Real Estate"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
          />
        </div>

        {/* Owner/Manager Name & Email (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.ownerName || ''}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <Mail size={14} />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@acme.com"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Phone size={14} />
            Business Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <MapPin size={14} />
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
          />
        </div>

        {/* City, State, Zip (3 columns) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Los Angeles"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="CA"
              maxLength="2"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ZIP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.zip || ''}
              onChange={(e) => handleChange('zip', e.target.value)}
              placeholder="90001"
              maxLength="10"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Clock size={14} />
            Timezone <span className="text-red-500">*</span>
          </label>
          <select
            value={data.timezone || 'America/Los_Angeles'}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none bg-white"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Website (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Globe size={14} />
            Website <span className="text-xs text-gray-500 font-normal">(Optional)</span>
          </label>
          <input
            type="url"
            value={data.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://www.acme.com"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          🔒 Your information is secure and will never be shared
        </p>
      </div>
    </div>
  );
}
