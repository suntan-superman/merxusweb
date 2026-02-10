import { Mail, AlertCircle } from 'lucide-react';

export default function FlyoverTwilioStep({ formData, onChange, onRequestTwilioInfo, isLocked = false }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Phone Setup</h3>
        <p className="text-gray-600 text-sm">Configure your AI phone number</p>
      </div>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600" size={20} />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">Number changes require support</p>
              <p className="text-sm text-amber-800">
                Your Merxus Twilio number is already assigned. Contact support to request a change.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-amber-800 font-medium mb-2">
          📞 Don't have your Twilio info yet?
        </p>
        <p className="text-sm text-amber-700 mb-3">
          Your Twilio phone number is provided by Merxus. Click below to request it.
        </p>
        <button
          onClick={onRequestTwilioInfo}
          disabled={isLocked}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Mail size={16} />
          Request from Merxus
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Twilio Phone Number
        </label>
        <input
          type="tel"
          value={formData.twilioPhoneNumber}
          onChange={(e) => onChange('twilioPhoneNumber', e.target.value)}
          className={`input-field ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="+15551234567"
          readOnly={isLocked}
        />
        <p className="text-xs text-gray-500 mt-1">
          Must be in E.164 format (e.g., +15551234567)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Twilio Number SID <span className="text-gray-400">(Optional)</span>
        </label>
        <input
          type="text"
          value={formData.twilioNumberSid}
          onChange={(e) => onChange('twilioNumberSid', e.target.value)}
          className="input-field"
          placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        />
        <p className="text-xs text-gray-500 mt-1">
          Starts with "PN" - provided by Merxus
        </p>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        You can skip this step and add it later in Settings.
      </p>
    </div>
  );
}
