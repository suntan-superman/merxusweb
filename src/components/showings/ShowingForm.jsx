import { useState, useEffect } from 'react';
import FormModal from '../common/FormModal';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export default function ShowingForm({ open, onClose, onSave, editing = null, listings = [] }) {
  const [form, setForm] = useState({
    listing_id: '',
    listing_address: '',
    scheduled_date: '',
    scheduled_time: '',
    start_time: '',
    end_time: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    status: 'scheduled',
    notes: '',
    attendees: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        listing_id: editing.listing_id || '',
        listing_address: editing.listing_address || '',
        scheduled_date: editing.scheduled_date || '',
        scheduled_time: editing.scheduled_time || editing.start_time || '',
        start_time: editing.start_time || '',
        end_time: editing.end_time || '',
        contact_name: editing.contact_name || '',
        contact_phone: editing.contact_phone || '',
        contact_email: editing.contact_email || '',
        status: editing.status || 'scheduled',
        notes: editing.notes || '',
        attendees: editing.attendees || '',
      });
    } else {
      setForm({
        listing_id: '',
        listing_address: '',
        scheduled_date: '',
        scheduled_time: '',
        start_time: '',
        end_time: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        status: 'scheduled',
        notes: '',
        attendees: '',
      });
    }
  }, [editing, open]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleListingChange(e) {
    const listingId = e.target.value;
    const listing = listings.find((l) => l.id === listingId);
    setForm((prev) => ({
      ...prev,
      listing_id: listingId,
      listing_address: listing
        ? `${listing.address || ''}, ${listing.city || ''}, ${listing.state || ''} ${listing.zip || ''}`.trim()
        : '',
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    const showingData = {
      ...form,
      start_time: form.start_time || form.scheduled_time,
    };

    onSave(showingData);
  }

  if (!open) return null;

  return (
    <FormModal
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Edit Showing' : 'Schedule New Showing'}
      width="700px"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Listing Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property *
          </label>
          {listings.length > 0 ? (
            <select
              name="listing_id"
              required
              value={form.listing_id}
              onChange={handleListingChange}
              className="input-field"
            >
              <option value="">Select a property...</option>
              {listings
                .filter((l) => l.status === 'active')
                .map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.address || 'Address'} - {listing.city || 'City'}, {listing.state || 'State'} {listing.zip || ''}
                  </option>
                ))}
            </select>
          ) : (
            <input
              type="text"
              name="listing_address"
              required
              value={form.listing_address}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter property address"
            />
          )}
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              name="scheduled_date"
              required
              value={form.scheduled_date}
              onChange={handleChange}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              type="time"
              name="start_time"
              required
              value={form.start_time || form.scheduled_time}
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
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                name="contact_name"
                required
                value={form.contact_name}
                onChange={handleChange}
                className="input-field"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone *
              </label>
              <input
                type="tel"
                name="contact_phone"
                required
                value={form.contact_phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                className="input-field"
                placeholder="john@example.com"
              />
            </div>
          </div>
        </div>

        {/* Status & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendees
            </label>
            <input
              type="text"
              name="attendees"
              value={form.attendees}
              onChange={handleChange}
              className="input-field"
              placeholder="Number of attendees"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            rows="3"
            value={form.notes}
            onChange={handleChange}
            className="input-field"
            placeholder="Additional notes about this showing..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {editing ? 'Update Showing' : 'Schedule Showing'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

