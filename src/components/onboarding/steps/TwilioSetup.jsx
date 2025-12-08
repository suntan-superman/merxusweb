import { useState } from 'react';
import { Phone, Key, ExternalLink, CheckCircle2, AlertCircle, Video, Search, ShoppingCart, Sparkles, Loader } from 'lucide-react';
import { searchAvailableNumbers, purchasePhoneNumber } from '../../../api/twilioProvisioning';
import { toast } from 'react-toastify';

export default function TwilioSetup({ data, onChange, tenantType, tenantId }) {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState('auto'); // 'auto' or 'manual'
  const [areaCode, setAreaCode] = useState('');
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [purchasingNumber, setPurchasingNumber] = useState(null);
  const [purchasedSuccess, setPurchasedSuccess] = useState(false);

  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  // Validate phone number format
  const isValidPhoneNumber = (phone) => {
    return /^\+?1?\d{10,15}$/.test(phone?.replace(/[\s\-\(\)]/g, ''));
  };

  const allFieldsFilled = data.twilioPhoneNumber && data.twilioAccountSid && data.twilioAuthToken;
  const phoneValid = isValidPhoneNumber(data.twilioPhoneNumber);

  // Handle number search
  const handleSearch = async () => {
    if (!areaCode || areaCode.length !== 3) {
      toast.error('Please enter a valid 3-digit area code');
      return;
    }

    setSearchingNumbers(true);
    try {
      const result = await searchAvailableNumbers(areaCode);
      setAvailableNumbers(result.numbers || []);
      if (result.numbers.length === 0) {
        toast.info(`No available numbers found in area code ${areaCode}`);
      } else {
        toast.success(`Found ${result.numbers.length} available numbers!`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search for numbers. Please try again.');
    } finally {
      setSearchingNumbers(false);
    }
  };

  // Handle number purchase
  const handlePurchase = async (phoneNumber) => {
    if (!tenantType || !tenantId) {
      toast.error('Missing tenant information. Please restart the wizard.');
      return;
    }

    setPurchasingNumber(phoneNumber);
    try {
      const result = await purchasePhoneNumber(
        phoneNumber,
        tenantType,
        tenantId,
        `Merxus ${tenantType} - ${data.businessName || tenantId}`,
        true // skipDbSave - we'll save when creating the tenant
      );

      // Update wizard data with purchased number info
      handleChange('twilioPhoneNumber', result.number.phoneNumber);
      handleChange('twilioPhoneSid', result.number.sid);
      handleChange('twilioAccountSid', 'auto_provisioned');
      handleChange('twilioAuthToken', 'auto_provisioned');
      handleChange('twilioWebhookUrls', result.webhookUrls);

      setPurchasedSuccess(true);
      toast.success('🎉 Phone number purchased and configured!');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase number. Please try again or use manual entry.');
    } finally {
      setPurchasingNumber(null);
    }
  };

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Your Phone Number</h3>
        <p className="text-gray-600">Choose how you want to set up your Twilio phone number</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Mode Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setMode('auto')}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'auto'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={18} />
            <span>Automatic Purchase</span>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'manual'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key size={18} />
            <span>Manual Entry</span>
          </button>
        </div>

        {/* Automatic Mode */}
        {mode === 'auto' && (
          <>
            {!purchasedSuccess ? (
              <>
                {/* Search Section */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">Instant Setup - $1.15/month</h4>
                      <p className="text-sm text-gray-700">
                        Search and purchase a phone number instantly. We'll configure everything for you!
                      </p>
                    </div>
                  </div>

                  {/* Area Code Search */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="Enter area code (e.g., 661)"
                      maxLength="3"
                      className="flex-1 px-4 py-2.5 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searchingNumbers || areaCode.length !== 3}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {searchingNumbers ? (
                        <>
                          <Loader className="animate-spin" size={18} />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search size={18} />
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Available Numbers List */}
                {availableNumbers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Available Numbers ({availableNumbers.length})</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                      {availableNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-green-400 transition-all flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-lg text-gray-900">{number.phoneNumber}</p>
                            <p className="text-sm text-gray-600">
                              {number.locality}, {number.region} {number.postalCode}
                            </p>
                          </div>
                          <button
                            onClick={() => handlePurchase(number.phoneNumber)}
                            disabled={purchasingNumber !== null}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {purchasingNumber === number.phoneNumber ? (
                              <>
                                <Loader className="animate-spin" size={16} />
                                Purchasing...
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={16} />
                                Buy
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">Phone Number Purchased!</h4>
                <p className="text-lg font-semibold text-green-700 mb-2">{data.twilioPhoneNumber}</p>
                <p className="text-sm text-gray-600">
                  Your number is configured and ready to receive calls. Click Continue to proceed.
                </p>
              </div>
            )}
          </>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">Already have a Twilio account?</h4>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li>1. Get your phone number from <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twilio Console</a></li>
                    <li>2. Copy your Account SID and Auth Token</li>
                    <li>3. Enter them below</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Twilio Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={data.twilioPhoneNumber || ''}
                  onChange={(e) => handleChange('twilioPhoneNumber', e.target.value)}
                  placeholder="+15551234567"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg transition-all outline-none ${
                    data.twilioPhoneNumber && !phoneValid
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100'
                  }`}
                />
                {data.twilioPhoneNumber && !phoneValid && (
                  <p className="text-xs text-red-600 mt-1">Use E.164 format (e.g., +15551234567)</p>
                )}
              </div>

              {/* Account SID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Account SID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.twilioAccountSid || ''}
                  onChange={(e) => handleChange('twilioAccountSid', e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none font-mono text-sm"
                />
              </div>

              {/* Auth Token */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Auth Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={data.twilioAuthToken || ''}
                  onChange={(e) => handleChange('twilioAuthToken', e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none font-mono text-sm"
                />
              </div>
            </div>

            {allFieldsFilled && phoneValid && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-green-900">Ready to connect!</p>
                  <p className="text-sm text-green-700">Click Continue to proceed</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
