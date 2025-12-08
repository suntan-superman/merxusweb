import { Building2, Utensils, Phone, Briefcase, AlertCircle } from 'lucide-react';

export default function IndustryCustomization({ tenantType, data, onChange }) {
  const handleChange = (field, value) => {
    const industryData = { ...data.industryData, [field]: value };
    onChange({ ...data, industryData });
  };

  // Restaurant-specific fields
  if (tenantType === 'restaurant') {
    return (
      <div className="py-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Utensils className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Settings</h3>
          <p className="text-gray-600">Customize your AI for taking orders and reservations</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Cuisine Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.industryData?.cuisineType || ''}
              onChange={(e) => handleChange('cuisineType', e.target.value)}
              placeholder="Italian, Mexican, Asian Fusion, etc."
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Restaurant Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.industryData?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe your restaurant, specialties, and atmosphere..."
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Dine-in Available?
              </label>
              <select
                value={data.industryData?.dineIn || 'yes'}
                onChange={(e) => handleChange('dineIn', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none bg-white"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Delivery/Takeout?
              </label>
              <select
                value={data.industryData?.delivery || 'yes'}
                onChange={(e) => handleChange('delivery', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none bg-white"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-orange-900 mb-1">📋 Next Step: Add Your Menu</p>
            <p className="text-orange-700">After setup, you'll be able to upload your menu so the AI can answer questions and take orders.</p>
          </div>
        </div>
      </div>
    );
  }

  // Real Estate-specific fields
  if (tenantType === 'real_estate') {
    return (
      <div className="py-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <Building2 className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Real Estate Settings</h3>
          <p className="text-gray-600">Set up your AI to handle showings and leads</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Agent/Team Name <span className="text-xs text-gray-500 font-normal">(Optional - defaults to your name)</span>
            </label>
            <input
              type="text"
              value={data.industryData?.brandName || ''}
              onChange={(e) => handleChange('brandName', e.target.value)}
              placeholder="The Smith Team"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Brokerage <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={data.industryData?.brokerage || ''}
              onChange={(e) => handleChange('brokerage', e.target.value)}
              placeholder="Keller Williams, RE/MAX, etc."
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              License Number <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={data.industryData?.licenseNumber || ''}
              onChange={(e) => handleChange('licenseNumber', e.target.value)}
              placeholder="DRE #12345678"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Primary Markets <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={data.industryData?.markets || ''}
              onChange={(e) => handleChange('markets', e.target.value)}
              placeholder="Los Angeles, Beverly Hills, Santa Monica"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-1">🏠 Next Step: Add Your Listings</p>
            <p className="text-blue-700">After setup, you can add property listings and the AI will schedule showings and send flyers automatically.</p>
          </div>
        </div>
      </div>
    );
  }

  // Voice/Professional Office-specific fields
  if (tenantType === 'voice') {
    return (
      <div className="py-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Phone className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional Office Settings</h3>
          <p className="text-gray-600">Configure call routing and team settings</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Business Type <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={data.industryData?.businessType || ''}
              onChange={(e) => handleChange('businessType', e.target.value)}
              placeholder="Law Firm, Medical Office, Consulting, etc."
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Services Offered <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={data.industryData?.services || ''}
              onChange={(e) => handleChange('services', e.target.value)}
              placeholder="List the main services you provide..."
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none resize-none"
            />
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-purple-900 mb-1">📞 Next Step: Configure Call Routing</p>
            <p className="text-purple-700">After setup, you can invite team members and set up advanced call routing rules.</p>
          </div>
        </div>
      </div>
    );
  }

  // General Business
  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
          <Briefcase className="text-white" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">General Business Settings</h3>
        <p className="text-gray-600">Tell us about your business so we can customize your AI</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Industry/Business Type <span className="text-xs text-gray-500 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={data.industryData?.industry || ''}
            onChange={(e) => handleChange('industry', e.target.value)}
            placeholder="Retail, Healthcare, Automotive, etc."
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            What should your AI help with? <span className="text-xs text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            value={data.industryData?.aiPurpose || ''}
            onChange={(e) => handleChange('aiPurpose', e.target.value)}
            placeholder="Answer questions, schedule appointments, take messages, provide information, etc."
            rows={3}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none resize-none"
          />
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-900 mb-1">🎯 Custom AI Prompts</p>
          <p className="text-gray-700">After setup, you can fully customize your AI's behavior and responses from the settings page.</p>
        </div>
      </div>
    </div>
  );
}
