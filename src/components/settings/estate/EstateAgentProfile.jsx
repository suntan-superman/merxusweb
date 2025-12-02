import { useState } from 'react';

export default function EstateAgentProfile({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    name: settings.name || '',
    brandName: settings.brandName || '',
    brokerage: settings.brokerage || '',
    licenseNumber: settings.licenseNumber || '',
    address: settings.address || '',
    phonePrimary: settings.phonePrimary || settings.phoneNumber || '',
    websiteUrl: settings.websiteUrl || '',
    markets: Array.isArray(settings.markets) ? settings.markets.join(', ') : (settings.markets || ''),
    twilioPhoneNumber: settings.twilioPhoneNumber || '',
    twilioNumberSid: settings.twilioNumberSid || '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    // Convert markets string to array
    const marketsArray = form.markets
      .split(/[,\n]/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    
    // Default brand name if not provided
    const brandName = form.brandName.trim() || `${form.name} Team`;
    
    onSave({
      ...form,
      markets: marketsArray,
      brandName,
      phoneNumber: form.phonePrimary, // Alias for compatibility
    });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Profile</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Jake Smith"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your professional name as a real estate agent
          </p>
        </div>

        <div>
          <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2">
            Brand Name
          </label>
          <input
            id="brandName"
            name="brandName"
            type="text"
            value={form.brandName}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., The Jake Smith Team"
          />
          <p className="text-xs text-gray-500 mt-1">
            If left blank, will default to "[Agent Name] Team"
          </p>
        </div>

        <div>
          <label htmlFor="brokerage" className="block text-sm font-medium text-gray-700 mb-2">
            Brokerage
          </label>
          <input
            id="brokerage"
            name="brokerage"
            type="text"
            value={form.brokerage}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Keller Williams, RE/MAX, Coldwell Banker"
          />
        </div>

        <div>
          <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
            License Number
          </label>
          <input
            id="licenseNumber"
            name="licenseNumber"
            type="text"
            value={form.licenseNumber}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., CA-123456"
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
          <label htmlFor="phonePrimary" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Phone Number
          </label>
          <input
            id="phonePrimary"
            name="phonePrimary"
            type="tel"
            value={form.phonePrimary}
            onChange={handleChange}
            className="input-field"
            placeholder="+1 (555) 123-4567"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your contact number (for internal use, not the Twilio number).
          </p>
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
            placeholder="https://yourwebsite.com"
          />
        </div>

        <div>
          <label htmlFor="markets" className="block text-sm font-medium text-gray-700 mb-2">
            Markets Served
          </label>
          <textarea
            id="markets"
            name="markets"
            rows="3"
            value={form.markets}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter cities, zip codes, or areas (one per line or comma-separated)&#10;e.g., Bakersfield, CA&#10;93312&#10;93314"
          />
          <p className="text-xs text-gray-500 mt-1">
            List the areas you serve. This helps the AI answer location-specific questions.
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
                placeholder="PNf330cac1b4a122220c9c9d854a5fd83e"
              />
              <p className="text-xs text-gray-500 mt-1">
                Twilio's unique identifier for the phone number (starts with "PN"). Found in your Twilio Console under Phone Numbers → Manage → Active Numbers.
                This helps the system identify your number more reliably.
              </p>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
}

