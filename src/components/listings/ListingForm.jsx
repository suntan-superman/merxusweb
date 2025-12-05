import { useState, useEffect, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import FormModal from '../common/FormModal';
import ConfirmationModal from '../common/ConfirmationModal';

const PROPERTY_TYPES = [
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Multi-Family', label: 'Multi-Family' },
  { value: 'Land', label: 'Land' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'contingent', label: 'Contingent' },
  { value: 'sold', label: 'Sold' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export default function ListingForm({ open, onClose, onSave, editing = null, onTestSend = null }) {
  const { agentId } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    mlsNumber: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    lotSize: '',
    propertyType: 'Single Family',
    status: 'active',
    yearBuilt: '',
    description: '',
    has_pool: false,
    has_garage: false,
    parking_spaces: '',
    features: [],
    highlights: '',
    photos: [],
    virtual_tour_url: '',
    showing_instructions: '',
    open_house: {
      date: '',
      start: '',
      end: '',
    },
    flyerUrl: '',
  });

  const [newFeature, setNewFeature] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const flyerAvailable = !!(editing?.flyerUrl || editing?.flyerURL);
  const [flyerStatus, setFlyerStatus] = useState(null); // { type: 'success'|'error'|'info', message: string }
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        address: editing.address || '',
        city: editing.city || '',
        state: editing.state || '',
        zipCode: editing.zipCode || editing.zip || '',
        mlsNumber: editing.mlsNumber || editing.mls_id || '',
        price: editing.price || '',
        bedrooms: editing.bedrooms || editing.beds || '',
        bathrooms: editing.bathrooms || editing.baths || '',
        sqft: editing.sqft || editing.sq_ft || '',
        lotSize: editing.lotSize || editing.lot_sq_ft || '',
        propertyType: editing.propertyType || editing.property_type || 'Single Family',
        status: editing.status || 'active',
        yearBuilt: editing.yearBuilt || editing.year_built || '',
        description: editing.description || editing.remarks_en || '',
        has_pool: editing.has_pool || false,
        has_garage: editing.has_garage || false,
        parking_spaces: editing.parking_spaces || '',
        features: editing.features || [],
        highlights: editing.highlights || editing.highlights_en || '',
        photos: editing.photos || [],
        virtual_tour_url: editing.virtual_tour_url || '',
        showing_instructions: editing.showing_instructions || '',
        open_house: editing.open_house || { date: '', start: '', end: '' },
        flyerUrl: editing.flyerUrl || editing.flyerURL || '',
      });
    } else {
      // Reset form for new listing
      setForm({
        address: '',
        city: '',
        state: '',
        zipCode: '',
        mlsNumber: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        sqft: '',
        lotSize: '',
        propertyType: 'Single Family',
        status: 'active',
        yearBuilt: '',
        description: '',
        has_pool: false,
        has_garage: false,
        parking_spaces: '',
        features: [],
        highlights: '',
        photos: [],
        virtual_tour_url: '',
        showing_instructions: '',
        open_house: { date: '', start: '', end: '' },
        flyerUrl: '',
      });
    }
    setHasUnsavedChanges(false);
  }, [editing, open]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setHasUnsavedChanges(true);
    if (name.startsWith('open_house.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        open_house: { ...prev.open_house, [field]: value },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  }

  function handleAddFeature() {
    if (newFeature.trim()) {
      setHasUnsavedChanges(true);
      setForm((prev) => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature('');
    }
  }

  function handleRemoveFeature(index) {
    setHasUnsavedChanges(true);
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  function handleAddPhoto() {
    if (newPhoto.trim()) {
      setHasUnsavedChanges(true);
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, newPhoto.trim()],
      }));
      setNewPhoto('');
    }
  }

  function handleRemovePhoto(index) {
    setHasUnsavedChanges(true);
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }

  function handleClose() {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }

  function handleConfirmClose() {
    setShowCloseConfirm(false);
    setHasUnsavedChanges(false);
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    // Convert string numbers to actual numbers
    const listingData = {
      ...form,
      price: form.price ? parseFloat(form.price) : 0,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : 0,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : 0,
      sqft: form.sqft ? parseInt(form.sqft, 10) : 0,
      yearBuilt: form.yearBuilt || '',
      parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces, 10) : null,
      open_house: {
        date: form.open_house.date || null,
        start: form.open_house.start || null,
        end: form.open_house.end || null,
      },
      flyerUrl: form.flyerUrl || '',
    };

    setHasUnsavedChanges(false);
    onSave(listingData);
  }

  const handleFlyerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFlyerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!editing?.id) {
      setFlyerStatus({ type: 'error', message: 'Save the listing first, then upload a flyer.' });
      return;
    }

    if (!agentId) {
      setFlyerStatus({ type: 'error', message: 'Missing agent ID; re-authenticate and retry.' });
      return;
    }

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      setFlyerStatus({ type: 'error', message: 'Only PDF or image files are allowed.' });
      return;
    }

    try {
      setUploading(true);
      setFlyerStatus({ type: 'info', message: 'Uploading flyer…' });
      const safeName = file.name.replace(/\s+/g, '-');
      const path = `agents/${agentId}/listings/${editing.id}/flyers/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((prev) => ({ ...prev, flyerUrl: url }));
      setHasUnsavedChanges(true);
      setFlyerStatus({ type: 'success', message: 'Flyer uploaded. Click Save to commit.' });
    } catch (err) {
      console.error('Flyer upload error:', err);
      setFlyerStatus({ type: 'error', message: 'Upload failed. Please retry.' });
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const headerActions = (
    <>
      <button type="button" onClick={handleClose} className="btn-secondary">
        Cancel
      </button>
      <button type="submit" form="listing-form" className="btn-primary">
        {editing ? 'Update Listing' : 'Create Listing'}
      </button>
    </>
  );

  return (
    <>
    <FormModal
      isOpen={open}
      onClose={handleClose}
      title={editing ? 'Edit Listing' : 'Add New Listing'}
      width="900px"
      resizable={true}
      storageKey="listing-form-modal"
      headerActions={headerActions}
    >
      <form id="listing-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'basic', label: 'Basic Info', icon: 'home' },
              { id: 'details', label: 'Property Details', icon: 'info' },
              { id: 'marketing', label: 'Marketing', icon: 'description' },
              { id: 'media', label: 'Flyer & Media', icon: 'photo' },
              { id: 'showing', label: 'Showing', icon: 'event' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-4" style={{ minHeight: '600px' }}>
        {activeTab === 'basic' && (
        <div>
        {/* Basic Information */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                name="address"
                required
                value={form.address}
                onChange={handleChange}
                className="input-field"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                required
                value={form.city}
                onChange={handleChange}
                className="input-field"
                placeholder="Bakersfield"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                name="state"
                required
                value={form.state}
                onChange={handleChange}
                className="input-field"
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code *
              </label>
              <input
                type="text"
                name="zipCode"
                required
                value={form.zipCode}
                onChange={handleChange}
                className="input-field"
                placeholder="93312"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MLS Number
              </label>
              <input
                type="text"
                name="mlsNumber"
                value={form.mlsNumber}
                onChange={handleChange}
                className="input-field"
                placeholder="MLS202512345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                required
                value={form.status}
                onChange={handleChange}
                className="input-field"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        </div>
        )}

        {activeTab === 'details' && (
        <div>
        {/* Pricing & Details */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Pricing & Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                name="price"
                required
                value={form.price}
                onChange={handleChange}
                className="input-field"
                placeholder="585000"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrooms
              </label>
              <input
                type="number"
                name="bedrooms"
                value={form.bedrooms}
                onChange={handleChange}
                className="input-field"
                placeholder="4"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                name="bathrooms"
                step="0.5"
                value={form.bathrooms}
                onChange={handleChange}
                className="input-field"
                placeholder="3"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Square Feet
              </label>
              <input
                type="number"
                name="sqft"
                value={form.sqft}
                onChange={handleChange}
                className="input-field"
                placeholder="2650"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lot Size
              </label>
              <input
                type="text"
                name="lotSize"
                value={form.lotSize}
                onChange={handleChange}
                className="input-field"
                placeholder="0.25 acres or 7405 sqft"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                name="propertyType"
                required
                value={form.propertyType}
                onChange={handleChange}
                className="input-field"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Built
              </label>
              <input
                type="text"
                name="yearBuilt"
                value={form.yearBuilt}
                onChange={handleChange}
                className="input-field"
                placeholder="2015"
                maxLength="4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parking Spaces
              </label>
              <input
                type="number"
                name="parking_spaces"
                value={form.parking_spaces}
                onChange={handleChange}
                className="input-field"
                placeholder="3"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Features</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                className="input-field flex-1"
                placeholder="Add a feature (e.g., Open-concept kitchen)"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="btn-secondary"
              >
                Add
              </button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="has_pool"
                checked={form.has_pool}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700">Has Pool</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="has_garage"
                checked={form.has_garage}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700">Has Garage</span>
            </label>
          </div>
        </div>
        </div>
        )}

        {activeTab === 'marketing' && (
        <div>
        {/* Description */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Description</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Description
              </label>
              <textarea
                name="description"
                rows="4"
                value={form.description}
                onChange={handleChange}
                className="input-field"
                placeholder="Beautiful home with modern kitchen and spacious backyard. Great location near schools and shopping..."
              />
            </div>
          </div>
        </div>

        {/* Highlights & Remarks (Advanced - Optional) */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Bilingual Content (Optional)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Highlights
              </label>
              <textarea
                name="highlights"
                rows="4"
                value={form.highlights}
                onChange={handleChange}
                className="input-field"
                placeholder="Beautiful 4-bed, 3-bath home in Northwest Bakersfield with modern finishes..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter highlights in English. The AI assistant will translate for Spanish-speaking callers automatically.
              </p>
            </div>
          </div>
        </div>
        </div>
        )}

        {activeTab === 'showing' && (
        <div>
        {/* Open House */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Open House</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                name="open_house.date"
                value={form.open_house.date}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                name="open_house.start"
                value={form.open_house.start}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                name="open_house.end"
                value={form.open_house.end}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>
        </div>
        )}

        {activeTab === 'media' && (
        <div>
        {/* Flyer Upload */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-semibold text-gray-900">Flyer</h3>
              <p className="text-sm text-gray-600">
                Upload a PDF or image to include in flyer emails.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleFlyerFileSelect}
                disabled={uploading || !editing}
                title={editing ? '' : 'Save the listing before uploading'}
              >
                {uploading ? 'Uploading…' : 'Upload Flyer'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setForm((prev) => ({ ...prev, flyerUrl: '' }));
                  setFlyerStatus({ type: 'info', message: 'Flyer removed. Save to apply.' });
                }}
                disabled={!form.flyerUrl}
              >
                Remove
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFlyerUpload}
          />

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flyer URL (optional)
            </label>
            <input
              type="url"
              name="flyerUrl"
              value={form.flyerUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, flyerUrl: e.target.value }))}
              className="input-field"
              placeholder="https://your-storage.com/flyers/listing.pdf"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can paste a URL or upload to generate one. Remember to save after changes.
            </p>
            {form.flyerUrl && (
              <a
                href={form.flyerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 text-sm inline-flex items-center gap-1 mt-2"
              >
                View current flyer
              </a>
            )}
            {flyerStatus && (
              <p
                className={`text-xs mt-2 ${
                  flyerStatus.type === 'error'
                    ? 'text-red-600'
                    : flyerStatus.type === 'success'
                    ? 'text-green-700'
                    : 'text-gray-600'
                }`}
              >
                {flyerStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Photos & Virtual Tour */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Photos & Virtual Tour</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo URLs
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={newPhoto}
                  onChange={(e) => setNewPhoto(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPhoto())}
                  className="input-field flex-1"
                  placeholder="https://example.com/photo.jpg"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              {form.photos.length > 0 && (
                <div className="space-y-1">
                  {form.photos.map((photo, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 truncate flex-1">{photo}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Virtual Tour URL
              </label>
              <input
                type="url"
                name="virtual_tour_url"
                value={form.virtual_tour_url}
                onChange={handleChange}
                className="input-field"
                placeholder="https://example.com/tour"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Showing Instructions
              </label>
              <textarea
                name="showing_instructions"
                rows="3"
                value={form.showing_instructions}
                onChange={handleChange}
                className="input-field"
                placeholder="Special instructions for showing this property..."
              />
            </div>
          </div>
        </div>

        {/* Test Send Flyer (only for editing) */}
        {editing && onTestSend && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Test Flyer Email</p>
                <p className="text-xs text-gray-600">
                  {flyerAvailable
                    ? 'Send a test flyer email to verify content and formatting.'
                    : 'Upload a flyer above to enable test sends.'}
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary ${!flyerAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => flyerAvailable && onTestSend(editing)}
                disabled={!flyerAvailable}
              >
                Send Test
              </button>
            </div>
          </div>
        )}

        </div>
        )}
        </div>
      </form>
    </FormModal>

    <ConfirmationModal
      isOpen={showCloseConfirm}
      onClose={() => setShowCloseConfirm(false)}
      onConfirm={handleConfirmClose}
      title="Unsaved Changes"
      message="You have unsaved changes. Are you sure you want to close? All changes will be lost."
      confirmText="Close Without Saving"
      cancelText="Keep Editing"
      variant="warning"
    />
    </>
  );
}

