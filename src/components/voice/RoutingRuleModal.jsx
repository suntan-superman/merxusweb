import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function RoutingRuleModal({ rule, onSave, onClose, saving }) {
  const isEdit = !!rule;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    priority: 0,
    conditions: {
      timeType: 'all', // all, business_hours, after_hours, specific_times
      daysOfWeek: [],
      timeRanges: [],
      intents: [],
      callerIds: [],
    },
    action: {
      type: 'transfer', // transfer, voicemail, message, department
      transferNumber: '',
      message: '',
      department: '',
    },
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        description: rule.description || '',
        enabled: rule.enabled !== false,
        priority: rule.priority || 0,
        conditions: rule.conditions || {
          timeType: 'all',
          daysOfWeek: [],
          timeRanges: [],
          intents: [],
          callerIds: [],
        },
        action: rule.action || {
          type: 'transfer',
          transferNumber: '',
          message: '',
          department: '',
        },
      });
    }
  }, [rule]);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleConditionChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [field]: value },
    }));
  }

  function handleActionChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      action: { ...prev.action, [field]: value },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Routing Rule' : 'Create Routing Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field"
                placeholder="e.g., After Hours to Voicemail"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="input-field"
                rows="2"
                placeholder="Optional description of what this rule does"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (0 = highest)
                </label>
                <input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', parseInt(e.target.value))}
                  className="input-field"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="enabled"
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                  Enabled
                </label>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h3>
            <p className="text-sm text-gray-600 mb-4">
              When should this rule apply?
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="timeType" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Condition
                </label>
                <select
                  id="timeType"
                  value={formData.conditions.timeType}
                  onChange={(e) => handleConditionChange('timeType', e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Times</option>
                  <option value="business_hours">Business Hours Only</option>
                  <option value="after_hours">After Hours Only</option>
                  <option value="specific_times">Specific Times (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intents (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.conditions.intents.join(', ')}
                  onChange={(e) =>
                    handleConditionChange(
                      'intents',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className="input-field"
                  placeholder="e.g., sales, support, billing"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to apply to all intents
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caller IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.conditions.callerIds.join(', ')}
                  onChange={(e) =>
                    handleConditionChange(
                      'callerIds',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className="input-field"
                  placeholder="e.g., +15551234567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to apply to all callers
                </p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Action</h3>
            <p className="text-sm text-gray-600 mb-4">
              What should happen when this rule matches?
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="actionType" className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type *
                </label>
                <select
                  id="actionType"
                  value={formData.action.type}
                  onChange={(e) => handleActionChange('type', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="transfer">Transfer to Phone Number</option>
                  <option value="voicemail">Send to Voicemail</option>
                  <option value="message">Play Custom Message</option>
                  <option value="department">Route to Department</option>
                </select>
              </div>

              {formData.action.type === 'transfer' && (
                <div>
                  <label htmlFor="transferNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Number *
                  </label>
                  <input
                    id="transferNumber"
                    type="tel"
                    value={formData.action.transferNumber}
                    onChange={(e) => handleActionChange('transferNumber', e.target.value)}
                    className="input-field"
                    placeholder="+15551234567"
                    required
                  />
                </div>
              )}

              {formData.action.type === 'message' && (
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Message *
                  </label>
                  <textarea
                    id="message"
                    value={formData.action.message}
                    onChange={(e) => handleActionChange('message', e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="The message the AI will say to the caller..."
                    required
                  />
                </div>
              )}

              {formData.action.type === 'department' && (
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    id="department"
                    type="text"
                    value={formData.action.department}
                    onChange={(e) => handleActionChange('department', e.target.value)}
                    className="input-field"
                    placeholder="e.g., Sales, Support"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
