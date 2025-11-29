import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRestaurant } from '../../api/merxus';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  
  // Restaurant info
  const [restaurantData, setRestaurantData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    twilioNumberSid: '',
    address: '',
    timezone: 'America/Los_Angeles',
  });

  // Initial manager/owner
  const [managerData, setManagerData] = useState({
    email: '',
    displayName: '',
    role: 'owner', // First user is always owner
  });

  function handleRestaurantChange(e) {
    const { name, value } = e.target;
    setRestaurantData((prev) => ({ ...prev, [name]: value }));
  }

  function handleManagerChange(e) {
    const { name, value } = e.target;
    setManagerData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createRestaurant({
        restaurant: restaurantData,
        manager: managerData,
      });

      // Show success message with invitation link (for testing)
      const message = result.invitationLink
        ? `Restaurant created successfully! Invitation link: ${result.invitationLink}`
        : 'Restaurant created successfully! The manager will receive an invitation email.';
      
      // Navigate to the new restaurant's detail page
      navigate(`/merxus/restaurants`, {
        state: { message },
      });
    } catch (err) {
      console.error('Error creating restaurant:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create restaurant.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Restaurant</h1>
        <p className="text-gray-600 mt-2">
          Set up a new restaurant account and create the initial manager/owner
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step >= 1 ? 'border-primary-600 bg-primary-50' : 'border-gray-300'
          }`}>
            {step > 1 ? '✓' : '1'}
          </div>
          <span className="ml-2 font-medium">Restaurant Info</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200"></div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step >= 2 ? 'border-primary-600 bg-primary-50' : 'border-gray-300'
          }`}>
            {step > 2 ? '✓' : '2'}
          </div>
          <span className="ml-2 font-medium">Manager Account</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Restaurant Information */}
        {step === 1 && (
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Restaurant Information</h2>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={restaurantData.name}
                onChange={handleRestaurantChange}
                className="input-field"
                placeholder="Joe's Pizza"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={restaurantData.email}
                onChange={handleRestaurantChange}
                className="input-field"
                placeholder="contact@joespizza.com"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Phone Number *
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={restaurantData.phoneNumber}
                onChange={handleRestaurantChange}
                className="input-field"
                placeholder="+15551234567"
              />
              <p className="mt-1 text-xs text-gray-500">
                The Twilio phone number assigned to this restaurant for AI call routing. 
                Must match the phone number configured in your Twilio account.
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
                value={restaurantData.twilioNumberSid}
                onChange={handleRestaurantChange}
                className="input-field"
                placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="mt-1 text-xs text-gray-500">
                Twilio's unique identifier for the phone number (starts with "PN"). 
                Found in your Twilio Console under Phone Numbers → Manage → Active Numbers.
              </p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={restaurantData.address}
                onChange={handleRestaurantChange}
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
                value={restaurantData.timezone}
                onChange={handleRestaurantChange}
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary"
              >
                Next: Manager Account →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Manager Account */}
        {step === 2 && (
          <div className="card space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Initial Manager/Owner Account</h2>
              {restaurantData.name && (
                <div className="mt-2 bg-primary-50 border border-primary-200 rounded-lg p-3">
                  <p className="text-sm text-primary-800">
                    <strong>Restaurant:</strong> <span className="font-semibold text-primary-900">{restaurantData.name}</span>
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Create the first user account for this restaurant. This person will be the owner and can invite additional team members.
            </p>

            <div>
              <label htmlFor="managerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                id="managerEmail"
                name="email"
                type="email"
                required
                value={managerData.email}
                onChange={handleManagerChange}
                className="input-field"
                placeholder="manager@joespizza.com"
              />
            </div>

            <div>
              <label htmlFor="managerName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                id="managerName"
                name="displayName"
                type="text"
                required
                value={managerData.displayName}
                onChange={handleManagerChange}
                className="input-field"
                placeholder="John Doe"
              />
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm text-primary-800">
                <strong>Note:</strong> The manager will receive an email invitation to set up their password and access the restaurant portal.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Restaurant'}
              </button>
            </div>
          </div>
        )}
      </form>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <LoadingSpinner text="Creating restaurant and setting up manager account..." />
          </div>
        </div>
      )}
    </div>
  );
}

