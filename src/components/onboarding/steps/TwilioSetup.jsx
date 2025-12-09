import React, { useState } from 'react';
import { Phone, Key, ExternalLink, CheckCircle2, AlertCircle, Video, Search, ShoppingCart, Sparkles, Loader } from 'lucide-react';
import { searchAvailableNumbers, purchasePhoneNumber, listUnassignedNumbers } from '../../../api/twilioProvisioning';
import { toast } from 'react-toastify';
import { formatPhoneDisplay, formatPhoneInput } from '../../../utils/phoneFormatter';

export default function TwilioSetup({ data, onChange, tenantType, tenantId }) {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState('auto'); // 'auto' or 'manual'
  const [areaCode, setAreaCode] = useState('');
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [purchasingNumber, setPurchasingNumber] = useState(null);
  const [purchasedSuccess, setPurchasedSuccess] = useState(false);
  const [recentlyPurchased, setRecentlyPurchased] = useState(null); // Store just-purchased number
  const [unassignedNumbers, setUnassignedNumbers] = useState([]); // Numbers from Twilio not yet assigned
  const [loadingUnassigned, setLoadingUnassigned] = useState(true);

  // Fetch unassigned numbers on mount
  React.useEffect(() => {
    console.log('=== [TwilioSetup] Component Mounted ===');
    console.log('Phone Number:', data.twilioPhoneNumber);
    console.log('Account SID:', data.twilioAccountSid);
    console.log('Auth Token:', data.twilioAuthToken);
    console.log('Phone SID:', data.twilioPhoneSid);
    
    // Check if already have an auto-provisioned number
    if (data.twilioPhoneNumber && 
        data.twilioAccountSid === 'auto_provisioned' && 
        data.twilioAuthToken === 'auto_provisioned') {
      console.log('✅ Detected auto-provisioned number, showing banner');
      setRecentlyPurchased({
        phoneNumber: data.twilioPhoneNumber,
        sid: data.twilioPhoneSid || 'unknown',
        friendlyName: `Merxus ${tenantType}`,
      });
      setPurchasedSuccess(true);
    } else {
      console.log('❌ No auto-provisioned number detected');
    }

    // Fetch unassigned numbers from Twilio
    const fetchUnassigned = async () => {
      try {
        console.log('🔍 Fetching unassigned numbers from Twilio...');
        const result = await listUnassignedNumbers();
        console.log('📞 Unassigned numbers:', result);
        setUnassignedNumbers(result.numbers || []);
      } catch (error) {
        console.error('Failed to fetch unassigned numbers:', error);
        // Silently fail - not critical
      } finally {
        setLoadingUnassigned(false);
      }
    };

    fetchUnassigned();
  }, []);

  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  // Use a recently purchased number
  const useRecentNumber = (number) => {
    onChange({
      ...data,
      twilioPhoneNumber: number.phoneNumber,
      twilioPhoneSid: number.sid,
      twilioAccountSid: 'auto_provisioned',
      twilioAuthToken: 'auto_provisioned',
    });
    setPurchasedSuccess(true);
    toast.success('✅ Using recently purchased number!');
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
        toast.info(`No available numbers found in area code ${areaCode}. Try a different area code.`);
      } else {
        toast.success(`🎉 Found ${result.numbers.length} available numbers!`);
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      if (errorMessage.includes('Twilio credentials not configured')) {
        toast.error('⚠️ Twilio not configured. Please contact support to enable automatic provisioning.');
      } else if (errorMessage.includes('Authentication failed')) {
        toast.error('Twilio authentication failed. Please contact support.');
      } else {
        toast.error(`Failed to search: ${errorMessage}`);
      }
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

      // Update wizard data with purchased number info (batch all updates together)
      onChange({
        ...data,
        twilioPhoneNumber: result.number.phoneNumber,
        twilioPhoneSid: result.number.sid,
        twilioAccountSid: 'auto_provisioned',
        twilioAuthToken: 'auto_provisioned',
        twilioWebhookUrls: result.webhookUrls,
      });

      // Store purchased number info for display
      setRecentlyPurchased({
        phoneNumber: result.number.phoneNumber,
        sid: result.number.sid,
        friendlyName: result.number.friendlyName,
      });

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
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Your AI Phone Number</h3>
        <p className="text-gray-600">Search and purchase a phone number instantly - no Twilio account needed!</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Highlight Automatic Mode */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 text-center">
          <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-gray-900 mb-2">✨ Instant Setup - Takes 30 Seconds</h4>
          <p className="text-gray-700">
            We'll purchase and configure a phone number for you. Everything is included in your plan!
          </p>
        </div>

        {/* Unassigned Numbers from Twilio - Show if found and no number selected yet */}
        {!data.twilioPhoneNumber && unassignedNumbers.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 mb-1">
                  🎉 Found {unassignedNumbers.length} Unassigned Number{unassignedNumbers.length > 1 ? 's' : ''}!
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  {unassignedNumbers.length === 1 
                    ? 'This number was purchased but not assigned yet. Want to use it?'
                    : 'These numbers were purchased but not assigned yet. Select one to use:'}
                </p>
                <div className="space-y-2 mb-3">
                  {unassignedNumbers.map((num) => (
                    <div key={num.sid} className="bg-white rounded-lg p-3 border border-blue-200 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-lg font-bold text-gray-900">
                          {formatPhoneDisplay(num.phoneNumber)}
                        </p>
                        {num.friendlyName && num.friendlyName !== num.phoneNumber && (
                          <p className="text-xs text-gray-500 mt-1">{num.friendlyName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => useRecentNumber(num)}
                        className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md"
                      >
                        ✓ Use This
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading unassigned numbers */}
        {!data.twilioPhoneNumber && loadingUnassigned && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
            <Loader className="w-5 h-5 text-gray-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-600">Checking for previously purchased numbers...</p>
          </div>
        )}

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
            <span>Instant Setup (Recommended)</span>
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
            <span>I Have My Own Twilio</span>
          </button>
        </div>

        {/* Automatic Mode */}
        {mode === 'auto' && (
          <>
            {!purchasedSuccess ? (
              <>
                {/* Search Section */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <Phone size={20} className="text-green-600" />
                      Step 1: Enter Your Area Code
                    </h4>
                    <p className="text-sm text-gray-600">
                      We'll find available phone numbers in your area. Popular: 212 (NYC), 310 (LA), 312 (Chicago), 415 (SF), 661 (Bakersfield)
                    </p>
                  </div>

                  {/* Area Code Search */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="Enter 3-digit area code (e.g., 661)"
                      maxLength="3"
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none text-lg font-semibold"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searchingNumbers || areaCode.length !== 3}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      {searchingNumbers ? (
                        <>
                          <Loader className="animate-spin" size={20} />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search size={20} />
                          Find Numbers
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Available Numbers List */}
                {availableNumbers.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <Phone size={20} className="text-green-600" />
                        Step 2: Choose Your Number ({availableNumbers.length} available)
                      </h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                      {availableNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Phone className="text-green-600" size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-xl text-gray-900 group-hover:text-green-700 transition-colors">
                                {formatPhoneDisplay(number.phoneNumber)}
                              </p>
                              <p className="text-sm text-gray-600">
                                📍 {number.locality}, {number.region} {number.postalCode}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePurchase(number.phoneNumber)}
                            disabled={purchasingNumber !== null}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                          >
                            {purchasingNumber === number.phoneNumber ? (
                              <>
                                <Loader className="animate-spin" size={18} />
                                Purchasing...
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={18} />
                                Select & Buy
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
                  value={data.twilioAccountSid === 'auto_provisioned' ? '' : (data.twilioAccountSid || '')}
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
                  value={data.twilioAuthToken === 'auto_provisioned' ? '' : (data.twilioAuthToken || '')}
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
