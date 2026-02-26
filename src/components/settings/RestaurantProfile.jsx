import { useState } from 'react';

export default function RestaurantProfile({ settings, onSave, saving }) {
  const merxusAiNumber = settings.twilioPhoneNumber || settings.phoneNumber || '';
  const [form, setForm] = useState({
    name: settings.name || '',
    address: settings.address || '',
    timezone: settings.timezone || 'America/Los_Angeles',
    phoneNumber: settings.phoneNumber || '',
    taxRate: settings.taxRate !== undefined ? (settings.taxRate * 100).toFixed(2) : '7.50',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Convert tax rate percentage to decimal before saving
    const dataToSave = {
      ...form,
      taxRate: parseFloat(form.taxRate) / 100,
    };
    onSave(dataToSave);
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Profile</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Restaurant Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="input-field"
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

        <div>
          <label htmlFor="merxusAiNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Merxus AI Number
          </label>
          <input
            id="merxusAiNumber"
            type="tel"
            value={merxusAiNumber}
            readOnly
            className="input-field bg-gray-50 cursor-not-allowed font-mono"
            placeholder="Not assigned yet"
          />
          <p className="mt-1 text-xs text-gray-500">
            This number is assigned by Merxus and cannot be changed in self-service.
          </p>
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Phone Number *
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            required
            value={form.phoneNumber}
            onChange={handleChange}
            className="input-field"
            placeholder="+15551234567"
          />
          <p className="mt-1 text-xs text-gray-500">
            Business contact number for internal notifications and profile details.
          </p>
        </div>

        <div>
          <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
            Combined Tax Rate (%)
          </label>
          <div className="relative">
            <input
              id="taxRate"
              name="taxRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.taxRate}
              onChange={handleChange}
              className="input-field pr-8"
              placeholder="7.50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              %
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Default tax rate applied to all orders (default: 7.5%)
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
}

