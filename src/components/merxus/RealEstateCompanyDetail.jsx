import { useState, useEffect } from 'react';
import { deleteRealEstateCompany, resendRealEstateInvitation } from '../../api/realEstate';
import ConfirmationModal from '../common/ConfirmationModal';

const defaultForm = {
  name: '',
  email: '',
  phoneNumber: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  timezone: 'America/Los_Angeles',
  disabled: false,
  brokerage: '',
  brokerageName: '',
  brokeragePhone: '',
  licenseNumber: '',
  yearsExperience: 0,
  homesSold: 0,
  activeListings: 0,
  awards: [],
  certifications: [],
  neighborhoods: [],
  markets: [],
  propertyExpertise: [],
};

export default function RealEstateCompanyDetail({ company = {}, onUpdate, onClose, loading }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState({
    ...defaultForm,
    name: company?.name || '',
    email: company?.email || '',
    phoneNumber: company?.phoneNumber || company?.phone || '',
    address: company?.address || '',
    city: company?.city || '',
    state: company?.state || '',
    zipCode: company?.zipCode || '',
    timezone: company?.timezone || 'America/Los_Angeles',
    disabled: company?.disabled || false,
    brokerage: company?.brokerage || company?.brokerageName || '',
    brokerageName: company?.brokerageName || company?.brokerage || '',
    brokeragePhone: company?.brokeragePhone || '',
    licenseNumber: company?.licenseNumber || '',
    yearsExperience: company?.yearsExperience || 0,
    homesSold: company?.homesSold || 0,
    activeListings: company?.activeListings || 0,
    awards: company?.awards || [],
    certifications: company?.certifications || [],
    neighborhoods: company?.neighborhoods || [],
    markets: company?.markets || [],
    propertyExpertise: company?.propertyExpertise || [],
  });

  // Update form whenever company prop changes
  useEffect(() => {
    setForm({
      ...defaultForm,
      name: company?.name || '',
      email: company?.email || '',
      phoneNumber: company?.phoneNumber || company?.phone || '',
      address: company?.address || '',
      city: company?.city || '',
      state: company?.state || '',
      zipCode: company?.zipCode || '',
      timezone: company?.timezone || 'America/Los_Angeles',
      disabled: company?.disabled || false,
      brokerage: company?.brokerage || company?.brokerageName || '',
      brokerageName: company?.brokerageName || company?.brokerage || '',
      brokeragePhone: company?.brokeragePhone || '',
      licenseNumber: company?.licenseNumber || '',
      yearsExperience: company?.yearsExperience || 0,
      homesSold: company?.homesSold || 0,
      activeListings: company?.activeListings || 0,
      awards: company?.awards || [],
      certifications: company?.certifications || [],
      neighborhoods: company?.neighborhoods || [],
      markets: company?.markets || [],
      propertyExpertise: company?.propertyExpertise || [],
    });
  }, [company?.id, company?.agentId]);

  // Handle ESC key to close edit mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && editing) {
        setEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing]);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(company.id || company.officeId, form);
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
      await deleteRealEstateCompany(company.id || company.officeId);
      setShowDeleteModal(false);
      window.location.href = '/merxus/real-estate';
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to delete company');
      setDeleting(false);
    }
  }

  async function handleResendInvitation() {
    setResending(true);
    setResendMessage(null);
    try {
      await resendRealEstateInvitation(company.id || company.officeId);
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

  return (
    <div className="card">
      <div className="border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{company.name || 'Real Estate Company'}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => editing ? setEditing(false) : onClose?.()}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
              title={editing ? "Close edit (ESC)" : "Close panel"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary text-sm"
              >
                Edit
              </button>
            )}
          </div>
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
            onClick={() => setActiveTab('address')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'address'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Address
          </button>
          <button
            onClick={() => setActiveTab('brokerage')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'brokerage'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Brokerage
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
              <label className="label">Agent Name</label>
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
              <label className="label">Agent ID</label>
              <input
                type="text"
                value={company.agentId || company.id || ''}
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
              <label className="label">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brand/Team Name</label>
              <input
                type="text"
                name="brandName"
                value={form.brandName || ''}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Brokerage</label>
              <input
                type="text"
                name="brokerage"
                value={form.brokerage}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Years of Experience</label>
              <input
                type="number"
                name="yearsExperience"
                value={form.yearsExperience}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Homes Sold</label>
              <input
                type="number"
                name="homesSold"
                value={form.homesSold}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Active Listings</label>
              <input
                type="number"
                name="activeListings"
                value={form.activeListings}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brokerage Phone</label>
              <input
                type="tel"
                name="brokeragePhone"
                value={form.brokeragePhone}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={form.licenseNumber}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'address' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="label">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">State</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Zip Code</label>
              <input
                type="text"
                name="zipCode"
                value={form.zipCode}
                onChange={handleChange}
                disabled={!editing}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Neighborhoods</label>
            <textarea
              name="neighborhoods"
              value={Array.isArray(form.neighborhoods) ? form.neighborhoods.join(', ') : ''}
              onChange={(e) => setForm(prev => ({ ...prev, neighborhoods: e.target.value.split(', ') }))}
              disabled={!editing}
              className="input-field h-20"
              placeholder="Enter neighborhoods, separated by commas"
            />
          </div>

          <div>
            <label className="label">Markets</label>
            <textarea
              name="markets"
              value={Array.isArray(form.markets) ? form.markets.join(', ') : ''}
              onChange={(e) => setForm(prev => ({ ...prev, markets: e.target.value.split(', ') }))}
              disabled={!editing}
              className="input-field h-20"
              placeholder="Enter markets, separated by commas"
            />
          </div>
        </div>
      )}

      {activeTab === 'brokerage' && (
        <div className="space-y-6">
          <div>
            <label className="label">Brokerage Name</label>
            <input
              type="text"
              name="brokerageName"
              value={form.brokerageName}
              onChange={handleChange}
              disabled={!editing}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Awards</label>
            <textarea
              name="awards"
              value={Array.isArray(form.awards) ? form.awards.join(', ') : ''}
              onChange={(e) => setForm(prev => ({ ...prev, awards: e.target.value.split(', ') }))}
              disabled={!editing}
              className="input-field h-20"
              placeholder="Enter awards, separated by commas"
            />
          </div>

          <div>
            <label className="label">Certifications</label>
            <textarea
              name="certifications"
              value={Array.isArray(form.certifications) ? form.certifications.join(', ') : ''}
              onChange={(e) => setForm(prev => ({ ...prev, certifications: e.target.value.split(', ') }))}
              disabled={!editing}
              className="input-field h-20"
              placeholder="Enter certifications, separated by commas"
            />
          </div>

          <div>
            <label className="label">Property Expertise</label>
            <textarea
              name="propertyExpertise"
              value={Array.isArray(form.propertyExpertise) ? form.propertyExpertise.join(', ') : ''}
              onChange={(e) => setForm(prev => ({ ...prev, propertyExpertise: e.target.value.split(', ') }))}
              disabled={!editing}
              className="input-field h-20"
              placeholder="Enter property expertise areas, separated by commas"
            />
          </div>
        </div>
      )}

      <div className="mt-6">
        {activeTab === 'basic' && (
          <>
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

            <div className="mt-4">
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
          </>
        )}

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

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Real Estate Company</h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning</p>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All data associated with <strong>{company.name}</strong> will be permanently deleted.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To confirm, type the company name exactly as shown:
                </label>
                <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 mb-3 text-sm font-mono text-gray-600">
                  {company.name}
                </div>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Enter company name"
                  className="input-field"
                  autoFocus
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmationText !== company.name}
                className={`btn-danger ${
                  deleteConfirmationText !== company.name
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>

            {deleteError && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteError && (
        <div className="p-3 rounded text-sm bg-red-50 text-red-700">
          {deleteError}
        </div>
      )}
    </div>
  );
}
