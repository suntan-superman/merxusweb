import { useState, useEffect } from 'react';
import { deleteVoice, resendVoiceInvitation } from '../../api/merxus';
import ConfirmationModal from '../common/ConfirmationModal';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const defaultForm = {
  name: '',
  email: '',
  phoneNumber: '',
  twilioPhoneNumber: '',
  address: '',
  businessType: '',
  category: '',
  industry: '',
  website: '',
  timezone: 'America/Los_Angeles',
  disabled: false,
  businessHours: {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: false },
    sunday: { open: '09:00', close: '17:00', closed: false },
  },
  aiConfig: {
    model: 'gpt-4o-mini',
    voiceName: 'alloy',
    language: 'en-US',
    systemPrompt: '',
  },
  notifySmsNumbers: [],
  notifyEmailAddresses: [],
};

export default function VoiceDetail({ voice = {}, onUpdate, loading }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState({
    ...defaultForm,
    name: voice?.name || '',
    email: voice?.email || '',
    phoneNumber: voice?.phoneNumber || '',
    twilioPhoneNumber: voice?.twilioPhoneNumber || '',
    address: voice?.address || '',
    businessType: voice?.businessType || '',
    category: voice?.category || '',
    industry: voice?.industry || '',
    website: voice?.website || '',
    timezone: voice?.timezone || 'America/Los_Angeles',
    disabled: voice?.disabled || false,
    businessHours: voice?.businessHours || defaultForm.businessHours,
    aiConfig: voice?.aiConfig || defaultForm.aiConfig,
    notifySmsNumbers: voice?.notifySmsNumbers || [],
    notifyEmailAddresses: voice?.notifyEmailAddresses || [],
  });

  // Update form whenever voice prop changes
  useEffect(() => {
    setForm({
      ...defaultForm,
      name: voice?.name || '',
      email: voice?.email || '',
      phoneNumber: voice?.phoneNumber || '',
      twilioPhoneNumber: voice?.twilioPhoneNumber || '',
      address: voice?.address || '',
      businessType: voice?.businessType || '',
      category: voice?.category || '',
      industry: voice?.industry || '',
      website: voice?.website || '',
      timezone: voice?.timezone || 'America/Los_Angeles',
      disabled: voice?.disabled || false,
      businessHours: voice?.businessHours || defaultForm.businessHours,
      aiConfig: voice?.aiConfig || defaultForm.aiConfig,
      notifySmsNumbers: voice?.notifySmsNumbers || [],
      notifyEmailAddresses: voice?.notifyEmailAddresses || [],
    });
  }, [voice?.id, voice?.officeId]);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(voice.id || voice.officeId, form);
      setEditing(false);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteVoice(voice.id || voice.officeId);
      setShowDeleteModal(false);
      window.location.href = '/merxus/voice-admin';
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to delete voice service');
      setDeleting(false);
    }
  }

  async function handleResendInvitation() {
    setResending(true);
    setResendMessage(null);
    try {
      await resendVoiceInvitation(voice.id || voice.officeId);
      setResendMessage('Invitation sent successfully!');
      setTimeout(() => setResendMessage(null), 3000);
    } catch (err) {
      console.error('Error sending invitation:', err);
      setResendMessage(err.message || 'Failed to send invitation');
    } finally {
      setResending(false);
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBusinessHourChange = (day, field, value) => {
    setForm(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleAiConfigChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      aiConfig: {
        ...prev.aiConfig,
        [field]: value,
      },
    }));
  };

  return (
    <div className="card">
      <div className="border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{voice.name || 'Voice Service'}</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary text-sm"
            >
              Edit
            </button>
          )}
        </div>

        <div className="flex gap-2 border-b border-gray-200 -mb-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'basic'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'hours'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Business Hours
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'ai'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            AI Config
          </button>
        </div>
      </div>

      {activeTab === 'basic' && (
        <div className="space-y-6">
          {resendMessage && (
            <div className={`p-3 rounded text-sm ${
              resendMessage.includes('success')
                ? 'bg-primary-50 text-primary-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {resendMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Service Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Office ID</label>
              <input
                type="text"
                value={voice.officeId || voice.id || ''}
                disabled
                className="input-field bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Twilio Phone Number</label>
              <input
                type="text"
                name="twilioPhoneNumber"
                value={form.twilioPhoneNumber}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
                placeholder="e.g., +16613451154"
              />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              disabled={!editing}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Industry</label>
              <input
                type="text"
                name="industry"
                value={form.industry}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Website</label>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              disabled={!editing}
              className="input-field"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="label">Timezone</label>
            <select
              name="timezone"
              value={form.timezone}
              onChange={handleChange}
              disabled={!editing}
              className="input-field"
            >
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Anchorage">Alaska Time</option>
              <option value="Pacific/Honolulu">Hawaii Time</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="disabled"
                checked={form.disabled}
                onChange={handleChange}
                disabled={!editing}
              />
              <span className="text-sm font-medium text-gray-700">Disabled</span>
            </label>
          </div>

          {editing && (
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleResendInvitation}
                disabled={resending}
                className="btn-secondary ml-auto"
              >
                {resending ? 'Sending...' : 'Resend Invitation'}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="space-y-4">
          {DAYS.map(day => (
            <div key={day.key} className="p-4 border border-gray-200 rounded">
              <div className="flex items-center gap-4">
                <label className="w-24 font-medium text-gray-700">{day.label}</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.businessHours[day.key]?.closed || false}
                    onChange={(e) => handleBusinessHourChange(day.key, 'closed', e.target.checked)}
                    disabled={!editing}
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>
                {!form.businessHours[day.key]?.closed && (
                  <div className="flex gap-2 ml-auto">
                    <input
                      type="time"
                      value={form.businessHours[day.key]?.open || '09:00'}
                      onChange={(e) => handleBusinessHourChange(day.key, 'open', e.target.value)}
                      disabled={!editing}
                      className="input-field text-sm w-28"
                    />
                    <span className="text-gray-600">to</span>
                    <input
                      type="time"
                      value={form.businessHours[day.key]?.close || '17:00'}
                      onChange={(e) => handleBusinessHourChange(day.key, 'close', e.target.value)}
                      disabled={!editing}
                      className="input-field text-sm w-28"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {editing && (
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div>
            <label className="label">Model</label>
            <select
              value={form.aiConfig.model}
              onChange={(e) => handleAiConfigChange('model', e.target.value)}
              disabled={!editing}
              className="input-field"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>

          <div>
            <label className="label">Voice Name</label>
            <select
              value={form.aiConfig.voiceName}
              onChange={(e) => handleAiConfigChange('voiceName', e.target.value)}
              disabled={!editing}
              className="input-field"
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </div>

          <div>
            <label className="label">Language</label>
            <input
              type="text"
              value={form.aiConfig.language}
              onChange={(e) => handleAiConfigChange('language', e.target.value)}
              disabled={!editing}
              className="input-field"
              placeholder="e.g., en-US, es-ES"
            />
          </div>

          <div>
            <label className="label">System Prompt</label>
            <textarea
              value={form.aiConfig.systemPrompt}
              onChange={(e) => handleAiConfigChange('systemPrompt', e.target.value)}
              disabled={!editing}
              className="input-field"
              rows="6"
              placeholder="Instructions for the AI..."
            />
          </div>

          {editing && (
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {showDeleteModal && (
        <ConfirmationModal
          title="Delete Voice Service"
          message={`Are you sure you want to delete "${voice.name || 'this voice service'}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isDangerous
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {deleteError && (
        <div className="p-3 rounded text-sm bg-red-50 text-red-700">
          {deleteError}
        </div>
      )}
    </div>
  );
}
