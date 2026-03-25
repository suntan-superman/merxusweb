import { Mail, AlertCircle } from 'lucide-react';

export default function FlyoverTwilioStep({ formData, onChange, onRequestTwilioInfo, isLocked = false }) {
  const hasAssignedNumber = Boolean(formData.twilioPhoneNumber?.trim());

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
                Your Merxus AI number is already assigned. Contact support to request a change.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasAssignedNumber && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-amber-800 font-medium mb-2">
            📞 Need your Merxus AI number?
          </p>
          <p className="text-sm text-amber-700 mb-3">
            Merxus provides your AI number. Click below if you still need it assigned.
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
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Merxus AI Number
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

      <p className="text-xs text-gray-500 text-center mt-4">
        You can skip this step and add it later in Settings.
      </p>
    </div>
  );
}
