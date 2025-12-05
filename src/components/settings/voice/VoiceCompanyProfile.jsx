import { useState, useEffect } from 'react';
import { getCategories, getIndustriesForCategory } from '../../../../data/voicePromptLibraryWithRouting';

export default function VoiceCompanyProfile({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    name: settings.name || '',
    address: settings.address || '',
    phoneNumber: settings.phoneNumber || '',
    websiteUrl: settings.websiteUrl || '',
    timezone: settings.timezone || 'America/Los_Angeles',
    twilioPhoneNumber: settings.twilioPhoneNumber || '',
    twilioNumberSid: settings.twilioNumberSid || '',
    businessType: settings.businessType || {
      category: '',
      industry: '',
    },
  });

  const [categories] = useState(() => {
    const base = getCategories();
    return Array.from(new Set([...base, 'General']));
  });
  const [industries, setIndustries] = useState([]);

  // Load industries when category changes
  useEffect(() => {
    if (form.businessType.category) {
      const categoryIndustries = form.businessType.category === 'General'
        ? ['General']
        : getIndustriesForCategory(form.businessType.category);

      setIndustries(categoryIndustries);
      
      // Reset or default industry when category changes
      if (form.businessType.category === 'General') {
        setForm((prev) => ({
          ...prev,
          businessType: { ...prev.businessType, industry: 'General' },
        }));
      } else if (form.businessType.industry && !categoryIndustries.includes(form.businessType.industry)) {
        setForm((prev) => ({
          ...prev,
          businessType: { ...prev.businessType, industry: '' },
        }));
      }
    } else {
      setIndustries([]);
    }
  }, [form.businessType.category]);

  // Initialize industries if category is already set
  useEffect(() => {
    if (settings.businessType?.category) {
      const categoryIndustries = settings.businessType.category === 'General'
        ? ['General']
        : getIndustriesForCategory(settings.businessType.category);
      setIndustries(categoryIndustries);
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBusinessTypeChange(field, value) {
    setForm((prev) => ({
      ...prev,
      businessType: {
        ...prev.businessType,
        [field]: value,
      },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter your business name"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={form.address}
            onChange={handleChange}
            className="input-field"
            placeholder="123 Main St, City, State ZIP"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Phone Number
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={handleChange}
            className="input-field"
            placeholder="+1 (555) 123-4567"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your business contact number (for internal use, not the Twilio number).
          </p>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Twilio Configuration</h4>
          <p className="text-sm text-gray-600 mb-4">
            Configure your Twilio phone number for AI call routing. This is the number that will receive calls.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="twilioPhoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Phone Number *
              </label>
              <input
                id="twilioPhoneNumber"
                name="twilioPhoneNumber"
                type="tel"
                required
                value={form.twilioPhoneNumber}
                onChange={handleChange}
                className="input-field"
                placeholder="+15551234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                The Twilio phone number assigned to your business for AI call routing. Must be in E.164 format (e.g., +15551234567).
                This number must match the phone number configured in your Twilio account.
              </p>
            </div>

            <div>
              <label htmlFor="twilioNumberSid" className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Number SID (Optional)
              </label>
              <input
                id="twilioNumberSid"
                name="twilioNumberSid"
                type="text"
                value={form.twilioNumberSid}
                onChange={handleChange}
                className="input-field"
                placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-500 mt-1">
                Twilio's unique identifier for the phone number (starts with "PN"). 
                Found in your Twilio Console under Phone Numbers → Manage → Active Numbers.
                This helps the system identify your number more reliably.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            value={form.websiteUrl}
            onChange={handleChange}
            className="input-field"
            placeholder="https://www.yourbusiness.com"
          />
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
            Timezone *
          </label>
          <select
            id="timezone"
            name="timezone"
            required
            value={form.timezone}
            onChange={handleChange}
            className="input-field"
          >
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Phoenix">Arizona (MST)</option>
            <option value="America/Anchorage">Alaska Time (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
          </select>
        </div>

        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Select your business category and industry to help customize your AI assistant prompts.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessCategory" className="block text-xs font-medium text-gray-600 mb-1">
                Category
              </label>
              <select
                id="businessCategory"
                required
                value={form.businessType.category}
                onChange={(e) => handleBusinessTypeChange('category', e.target.value)}
                className="input-field"
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="businessIndustry" className="block text-xs font-medium text-gray-600 mb-1">
                Industry
              </label>
              <select
                id="businessIndustry"
                required
                value={form.businessType.industry}
                onChange={(e) => handleBusinessTypeChange('industry', e.target.value)}
                className="input-field"
                disabled={!form.businessType.category}
              >
                <option value="">
                  {form.businessType.category ? 'Select an industry...' : 'Select category first...'}
                </option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Business Information'}
        </button>
      </form>
    </section>
  );
}

