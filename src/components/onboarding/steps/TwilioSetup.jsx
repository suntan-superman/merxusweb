import React, { useEffect, useRef, useState } from 'react';
import { Phone, Key, ExternalLink, CheckCircle2, AlertCircle, Search, ShoppingCart, Sparkles, Loader } from 'lucide-react';
import { searchAvailableNumbers, listUnassignedNumbers, purchasePhoneNumber } from '../../../api/twilioProvisioning';
import { toast } from 'react-toastify';
import { formatPhoneDisplay } from '../../../utils/phoneFormatter';
import { trackWorksideAnalyticsEvent } from '../../../utils/worksideAnalytics';
import { ADOPTION_EVENTS } from '../../../constants/adoptionEvents';

const RESERVED_TWILIO_PHONE_NUMBERS = new Set(['+18882506769', '+16614047441', '+16613872290']);

function normalizePhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (String(value || '').trim().startsWith('+') || digits.length >= 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+${digits}`;
}

function isReservedTwilioPhoneNumber(value) {
  return RESERVED_TWILIO_PHONE_NUMBERS.has(normalizePhoneNumber(value));
}

export default function TwilioSetup({ data, onChange, tenantType, tenantId, demoProvisioning = false }) {
  const setupStartedTracked = useRef(false);
  const [mode, setMode] = useState('auto'); // 'auto' or 'manual'
  const [areaCode, setAreaCode] = useState('');
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [purchasingNumber, setPurchasingNumber] = useState(null);
  const [purchasedSuccess, setPurchasedSuccess] = useState(false);
  const [unassignedNumbers, setUnassignedNumbers] = useState([]); // Numbers from Twilio not yet assigned
  const [loadingUnassigned, setLoadingUnassigned] = useState(true);
  const paymentCompleted = !!data.paymentCompleted;
  const provisioningReady = paymentCompleted && tenantType && tenantId;
  const provisioningBlocked = !provisioningReady;
  const isAutoProvisioned =
    data.twilioAccountSid === 'auto_provisioned' || data.twilioAuthToken === 'auto_provisioned';
  const isLocked = !!data.twilioPhoneNumber && isAutoProvisioned;
  const assigneeName = (data.businessName || data.ownerName || 'your business').trim();
  const assignedNumber = data.twilioPhoneNumber
    ? formatPhoneDisplay(data.twilioPhoneNumber)
    : 'this number';

  useEffect(() => {
    if (setupStartedTracked.current) return;
    setupStartedTracked.current = true;
    void trackWorksideAnalyticsEvent(ADOPTION_EVENTS.PHONE_SETUP_STARTED, {
      tenantId: tenantId || null,
      tenantType: tenantType === 'office' ? 'voice' : tenantType,
    }, { sessionId: tenantId || null });
  }, [tenantId, tenantType]);

  // Detect previously auto-provisioned number
  React.useEffect(() => {
    console.log('=== [TwilioSetup] Component Mounted ===');
    console.log('Phone Number:', data.twilioPhoneNumber);
    console.log('Account SID:', data.twilioAccountSid);
    console.log('Auth Token:', data.twilioAuthToken);
    console.log('Phone SID:', data.twilioPhoneSid);

    if (
      data.twilioPhoneNumber &&
      data.twilioAccountSid === 'auto_provisioned' &&
      data.twilioAuthToken === 'auto_provisioned'
    ) {
      console.log('✅ Detected auto-provisioned number, showing banner');
      setPurchasedSuccess(true);
    } else {
      console.log('❌ No auto-provisioned number detected');
    }
  }, [data.twilioPhoneNumber, data.twilioAccountSid, data.twilioAuthToken, data.twilioPhoneSid, tenantType]);

  // Fetch unassigned numbers when payment is complete
  React.useEffect(() => {
    if (!paymentCompleted) {
      setLoadingUnassigned(false);
      setUnassignedNumbers([]);
      return;
    }

    const fetchUnassigned = async () => {
      try {
        setLoadingUnassigned(true);
        console.log('🔍 Fetching unassigned numbers from Twilio...');
        const result = await listUnassignedNumbers(tenantId);
        console.log('📞 Unassigned numbers:', result);
        setUnassignedNumbers((result.numbers || []).filter((item) => !isReservedTwilioPhoneNumber(item.phoneNumber)));
      } catch (error) {
        console.error('Failed to fetch unassigned numbers:', error);
        toast.info('Could not load pre-purchased numbers. You can still search by area code below.');
      } finally {
        setLoadingUnassigned(false);
      }
    };

    fetchUnassigned();
  }, [paymentCompleted, tenantId]);

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleManualPhoneChange = (value) => {
    if (isReservedTwilioPhoneNumber(value)) {
      toast.error('This phone number is reserved for Merxus system messaging and cannot be used.');
      onChange({ twilioPhoneNumber: '' });
      return;
    }
    onChange({ twilioPhoneNumber: value });
  };

  // Assign or purchase a number after payment
  const assignNumber = async ({ phoneNumber, sid, twilioAccountKey }) => {
    if (!paymentCompleted) {
      toast.error('Please complete payment first.');
      return;
    }
    if (!tenantType || !tenantId) {
      toast.error('Tenant setup not complete yet. Please continue setup.');
      return;
    }

    const normalizedTenantType = tenantType === 'office' ? 'voice' : tenantType;

    if (isReservedTwilioPhoneNumber(phoneNumber)) {
      toast.error('This phone number is reserved for Merxus system messaging and cannot be assigned.');
      return;
    }

    setPurchasingNumber(phoneNumber);
    try {
      const result = await purchasePhoneNumber(
        phoneNumber,
        normalizedTenantType,
        tenantId,
        `Merxus ${normalizedTenantType || 'Office'}`,
        false,
        sid,
        twilioAccountKey
      );

      const assigned = result?.number || {};
      const assignedPhone = assigned.phoneNumber || phoneNumber;
      const assignedSid = assigned.sid || sid || '';

      onChange({
        twilioPhoneNumber: assignedPhone,
        twilioPhoneSid: assignedSid,
        twilioAccountKey: assigned.twilioAccountKey || twilioAccountKey || 'primary',
        twilioAccountSid: 'auto_provisioned',
        twilioAuthToken: 'auto_provisioned',
        demoPhoneDeferred: false,
      });
      void trackWorksideAnalyticsEvent(ADOPTION_EVENTS.PHONE_SETUP_COMPLETED, {
        tenantId,
        tenantType: normalizedTenantType,
        assignmentSource: sid ? 'existing_inventory' : 'new_purchase',
        twilioAccountKey: assigned.twilioAccountKey || twilioAccountKey || 'primary',
      }, { sessionId: tenantId });

      setPurchasedSuccess(true);
      if (result?.confirmationEmailSent === true) {
        toast.success('✅ Phone number assigned. Confirmation email sent.');
      } else if (result?.confirmationEmailSent === false) {
        toast.warn('Phone number assigned, but confirmation email could not be sent.');
      } else {
        toast.success('✅ Phone number assigned!');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to assign number';
      toast.error(errorMessage);
    } finally {
      setPurchasingNumber(null);
    }
  };

  // Validate phone number format
  const isValidPhoneNumber = (phone) => {
    return /^\+?1?\d{10,15}$/.test(phone?.replace(/[\s\-\(\)]/g, ''));
  };

  const allFieldsFilled = data.twilioPhoneNumber && data.twilioAccountSid && data.twilioAuthToken;
  const phoneReserved = isReservedTwilioPhoneNumber(data.twilioPhoneNumber);
  const phoneValid = isValidPhoneNumber(data.twilioPhoneNumber) && !phoneReserved;

  // Handle number search
  const handleSearch = async () => {
    if (provisioningBlocked) {
      toast.error('Please complete payment first.');
      return;
    }
    if (!areaCode || areaCode.length !== 3) {
      toast.error('Please enter a valid 3-digit area code');
      return;
    }

    setSearchingNumbers(true);
    try {
      const result = await searchAvailableNumbers(areaCode, tenantId);
      const filteredNumbers = (result.numbers || []).filter((item) => !isReservedTwilioPhoneNumber(item.phoneNumber));
      setAvailableNumbers(filteredNumbers);
      if (filteredNumbers.length === 0) {
        toast.info(`No available numbers found in area code ${areaCode}. Try a different area code.`);
      } else {
        toast.success(`🎉 Found ${filteredNumbers.length} available numbers!`);
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
      
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

  // Handle number selection (purchase/assign happens now)
  const handleSelectNumber = async (number) => {
    await assignNumber({
      phoneNumber: number.phoneNumber,
      twilioAccountKey: number.twilioAccountKey,
    });
  };

  if (isLocked) {
    return (
      <div className="py-4">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            The AI number {assignedNumber} has been assigned to {assigneeName}
          </h3>
          <p className="text-gray-600">This number is now assigned and ready to use.</p>
        </div>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600" size={22} />
              <div>
                <p className="font-semibold text-amber-900 mb-1">Number changes require support</p>
                <p className="text-sm text-amber-800">
                  This number is now assigned to {assigneeName} and cannot be changed in self-service.
                  Please contact support if you need to change it.
                </p>
                <p className="mt-3 font-mono text-lg text-amber-900">
                  {assignedNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Your AI Phone Number</h3>
        <p className="text-gray-600">
          {demoProvisioning
            ? 'Reuse an available Merxus number first, or purchase a new number when needed.'
            : 'Search and select a phone number instantly - no Twilio account needed!'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {['voice', 'office', 'real_estate'].includes(tenantType) && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 text-left">
            <h4 className="font-bold text-blue-950 mb-1">Keep your existing business number</h4>
            <p className="text-sm text-blue-900">
              Customers continue calling the number they already know. This Merxus routing number works
              behind it through call forwarding, and you can choose All Calls, Overflow / No Answer,
              After Hours, or Off / Bypass during forwarding setup.
            </p>
          </div>
        )}
        {!paymentCompleted && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-amber-900">Payment required to select a number</p>
                <p className="text-sm text-amber-800">
                  Please go back and complete the onboarding payment to unlock phone number selection.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Highlight Automatic Mode */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 text-center">
          <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            {demoProvisioning ? 'Admin Demo Number Assignment' : '✨ Instant Setup - Takes 30 Seconds'}
          </h4>
          <p className="text-gray-700">
            {demoProvisioning
              ? 'Existing Twilio numbers not associated with an active or paused Merxus account are shown first. If none are suitable, search by area code and purchase a new one.'
              : "Choose a number and we'll assign it instantly. Everything is included in your plan!"}
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
                    ? 'This Merxus-owned number is not tied to an active or paused account. Use it before purchasing another number when practical.'
                    : 'These Merxus-owned numbers are not tied to active or paused accounts. Select one before purchasing another number when practical:'}
                </p>
                <div className="space-y-2 mb-3">
                  {unassignedNumbers.map((num) => (
                    <div key={`${num.twilioAccountKey || 'legacy'}:${num.sid}`} className="bg-white rounded-lg p-3 border border-blue-200 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-lg font-bold text-gray-900">
                          {formatPhoneDisplay(num.phoneNumber)}
                        </p>
                        {num.friendlyName && num.friendlyName !== num.phoneNumber && (
                          <p className="text-xs text-gray-500 mt-1">{num.friendlyName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => assignNumber({
                          phoneNumber: num.phoneNumber,
                          sid: num.sid,
                          twilioAccountKey: num.twilioAccountKey,
                        })}
                        disabled={provisioningBlocked || purchasingNumber !== null}
                        className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {purchasingNumber === num.phoneNumber ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            Assigning...
                          </>
                        ) : (
                          <>✓ Use This</>
                        )}
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

        {!data.twilioPhoneNumber && !loadingUnassigned && unassignedNumbers.length === 0 && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">
              {demoProvisioning
                ? 'No reusable Merxus-owned numbers are currently available. Search by area code below to purchase one.'
                : 'No pre-purchased numbers found. Search by area code below.'}
            </p>
            {demoProvisioning && (
              <button
                type="button"
                onClick={() => onChange({ demoPhoneDeferred: true })}
                className="mt-3 rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Continue without a phone number
              </button>
            )}
            {demoProvisioning && data.demoPhoneDeferred && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Phone assignment is deferred. The demo portal will work, but calls cannot be tested yet.
              </p>
            )}
          </div>
        )}

        {/* Mode Tabs */}
        {!demoProvisioning && <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
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
        </div>}

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
                      {demoProvisioning ? 'Fallback: Purchase a New Number' : 'Step 1: Enter Your Area Code'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {demoProvisioning
                        ? 'Use this only when none of the reusable numbers above are suitable. Enter an area code to search Twilio.'
                        : "We'll find available phone numbers in your area. Popular: 212 (NYC), 310 (LA), 312 (Chicago), 415 (SF), 661 (Bakersfield)"}
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
                      disabled={provisioningBlocked || searchingNumbers || areaCode.length !== 3}
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
                        {demoProvisioning ? 'Choose a Number to Purchase' : 'Step 2: Choose Your Number'} ({availableNumbers.length} available)
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
                            onClick={() => handleSelectNumber(number)}
                            disabled={provisioningBlocked || purchasingNumber !== null}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                          >
                            {purchasingNumber === number.phoneNumber ? (
                              <>
                                <Loader className="animate-spin" size={18} />
                                Assigning...
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={18} />
                                {demoProvisioning ? 'Purchase & Assign' : 'Assign'}
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
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  The AI number {assignedNumber} has been assigned to {assigneeName}
                </h4>
                <p className="text-lg font-semibold text-green-700 mb-2">{assignedNumber}</p>
                <p className="text-sm text-gray-600">
                  This number is now assigned and ready to use. Click Continue to proceed.
                </p>
              </div>
            )}
          </>
        )}

        {/* Manual Mode */}
        {!demoProvisioning && mode === 'manual' && (
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
                  onChange={(e) => handleManualPhoneChange(e.target.value)}
                  placeholder="+15551234567"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg transition-all outline-none ${
                    data.twilioPhoneNumber && !phoneValid
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100'
                  }`}
                />
                {data.twilioPhoneNumber && !phoneValid && (
                  <p className="text-xs text-red-600 mt-1">
                    {phoneReserved
                      ? 'This phone number is reserved for Merxus system messaging and cannot be used.'
                      : 'Use E.164 format (e.g., +15551234567)'}
                  </p>
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
