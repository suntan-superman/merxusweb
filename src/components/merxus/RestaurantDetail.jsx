import { useState, useEffect } from 'react';
import { deleteRestaurant, resendInvitation, fetchRestaurantMenu, createRestaurantMenuItem, updateRestaurantMenuItem, deleteRestaurantMenuItem, toggleRestaurantMenuItemAvailability } from '../../api/merxus';
import MenuTable from '../menu/MenuTable';
import MenuItemForm from '../menu/MenuItemForm';
import MenuImport from '../menu/MenuImport';
import ConfirmationModal from '../common/ConfirmationModal';
import PromptDropdown from '../settings/PromptDropdown';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function RestaurantDetail({ restaurant = {}, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteMenuItemModal, setShowDeleteMenuItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [form, setForm] = useState({
    // Basic info
    name: restaurant?.name || '',
    email: restaurant?.email || '',
    phoneNumber: restaurant?.phoneNumber || '',
    address: restaurant?.address || '',
    timezone: restaurant?.timezone || 'America/Los_Angeles',
    disabled: restaurant?.disabled || false,
    // Business hours
    businessHours: restaurant?.businessHours || {
      monday: { open: '11:00', close: '21:00', closed: false },
      tuesday: { open: '11:00', close: '21:00', closed: false },
      wednesday: { open: '11:00', close: '21:00', closed: false },
      thursday: { open: '11:00', close: '21:00', closed: false },
      friday: { open: '11:00', close: '21:00', closed: false },
      saturday: { open: '11:00', close: '21:00', closed: false },
      sunday: { open: '11:00', close: '21:00', closed: false },
    },
    // AI settings
    aiConfig: restaurant?.aiConfig || {
      model: 'gpt-4o-mini',
      voiceName: 'alloy',
      language: 'en-US',
      systemPrompt: '',
    },
    // Notifications
    notifySmsNumbers: restaurant?.notifySmsNumbers || [],
    notifyEmailAddresses: restaurant?.notifyEmailAddresses || [],
    // Twilio
    twilioNumberSid: restaurant?.twilioNumberSid || '',
  });

  // Load menu when menu tab is active
  useEffect(() => {
    if (activeTab === 'menu' && restaurant?.id) {
      loadMenu();
    }
  }, [activeTab, restaurant?.id]);

  async function loadMenu() {
    if (!restaurant?.id) return;
    setMenuLoading(true);
    setMenuError(null);
    try {
      const items = await fetchRestaurantMenu(restaurant.id || restaurant.restaurantId);
      setMenu(items);
    } catch (err) {
      console.error('Error loading menu:', err);
      setMenuError('Failed to load menu items.');
    } finally {
      setMenuLoading(false);
    }
  }

  function handleAddMenuItem() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function handleEditMenuItem(item) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function handleSaveMenuItem(item) {
    try {
      if (editingItem) {
        const updated = await updateRestaurantMenuItem(restaurant.id || restaurant.restaurantId, editingItem.id, item);
        setMenu((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await createRestaurantMenuItem(restaurant.id || restaurant.restaurantId, item);
        setMenu((prev) => [created, ...prev]);
      }
      setFormOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving menu item:', err);
      setMenuError('Failed to save menu item.');
    }
  }

  function handleDeleteMenuItem(item) {
    setItemToDelete(item);
    setShowDeleteMenuItemModal(true);
  }

  async function confirmDeleteMenuItem() {
    if (!itemToDelete) return;
    try {
      await deleteRestaurantMenuItem(restaurant.id || restaurant.restaurantId, itemToDelete.id);
      setMenu((prev) => prev.filter((m) => m.id !== itemToDelete.id));
      setShowDeleteMenuItemModal(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting menu item:', err);
      setMenuError('Failed to delete menu item.');
      setShowDeleteMenuItemModal(false);
      setItemToDelete(null);
    }
  }

  async function handleToggleMenuItemAvailability(item) {
    try {
      const updated = await toggleRestaurantMenuItemAvailability(restaurant.id || restaurant.restaurantId, item.id, !item.isAvailable);
      setMenu((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      console.error('Error updating availability:', err);
      setMenuError('Failed to update availability.');
    }
  }

  // Update form when restaurant changes
  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant?.name || '',
        email: restaurant?.email || '',
        phoneNumber: restaurant?.phoneNumber || '',
        address: restaurant?.address || '',
        timezone: restaurant?.timezone || 'America/Los_Angeles',
        disabled: restaurant?.disabled || false,
        businessHours: restaurant?.businessHours || {
          monday: { open: '11:00', close: '21:00', closed: false },
          tuesday: { open: '11:00', close: '21:00', closed: false },
          wednesday: { open: '11:00', close: '21:00', closed: false },
          thursday: { open: '11:00', close: '21:00', closed: false },
          friday: { open: '11:00', close: '21:00', closed: false },
          saturday: { open: '11:00', close: '21:00', closed: false },
          sunday: { open: '11:00', close: '21:00', closed: false },
        },
        aiConfig: restaurant?.aiConfig || {
          model: 'gpt-4o-mini',
          voiceName: 'alloy',
          language: 'en-US',
          systemPrompt: '',
        },
        notifySmsNumbers: restaurant?.notifySmsNumbers || [],
        notifyEmailAddresses: restaurant?.notifyEmailAddresses || [],
        twilioNumberSid: restaurant?.twilioNumberSid || '',
      });
    }
  }, [restaurant]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleHoursChange(day, field, value) {
    setForm((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value },
      },
    }));
  }

  function handleAIConfigChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      aiConfig: {
        ...prev.aiConfig,
        [name]: value,
      },
    }));
  }

  function handlePromptChange(newPrompt) {
    setForm((prev) => ({
      ...prev,
      aiConfig: {
        ...prev.aiConfig,
        systemPrompt: newPrompt,
      },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(restaurant.id || restaurant.restaurantId, form);
      setEditing(false);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    setShowDeleteModal(false);
    try {
      await deleteRestaurant(restaurant.id || restaurant.restaurantId);
      onClose();
      // Reload page or trigger refresh
      window.location.reload();
    } catch (err) {
      console.error('Error deleting restaurant:', err);
      setDeleteError(err.response?.data?.error || err.message || 'Failed to delete restaurant');
    } finally {
      setDeleting(false);
    }
  }

  async function handleResendInvitation() {
    setResending(true);
    setResendMessage(null);
    try {
      const result = await resendInvitation(restaurant.id || restaurant.restaurantId);
      setResendMessage({
        type: 'success',
        text: result.message || 'Invitation email sent successfully',
        link: result.invitationLink,
        email: result.email,
      });
    } catch (err) {
      console.error('Error resending invitation:', err);
      setResendMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to resend invitation',
      });
    } finally {
      setResending(false);
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'hours', label: 'Business Hours' },
    { id: 'ai', label: 'AI Settings' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'menu', label: 'Menu Items' },
  ];

  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  return (
    <div className="card sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Restaurant Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {!editing ? (
        <>
          {/* View Mode */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Restaurant ID
              </label>
              <p className="text-sm text-gray-900 font-mono">
                {restaurant.restaurantId || restaurant.id}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Name
              </label>
              <p className="text-sm text-gray-900">{restaurant.name || '—'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Email
              </label>
              <p className="text-sm text-gray-900">{restaurant.email || '—'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Phone
              </label>
              <p className="text-sm text-gray-900">{restaurant.phoneNumber || '—'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <p className="text-sm">
                {restaurant.disabled ? (
                  <span className="text-red-600 font-medium">Disabled</span>
                ) : (
                  <span className="text-primary-600 font-medium">Active</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Total Orders
              </label>
              <p className="text-sm text-gray-900">{restaurant.totalOrders || 0}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex space-x-2">
              <button onClick={() => setEditing(true)} className="btn-primary flex-1">
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || restaurant.totalOrders > 0}
                className="btn-secondary flex-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={restaurant.totalOrders > 0 ? 'Cannot delete restaurant with orders' : ''}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            
            <button
              onClick={handleResendInvitation}
              disabled={resending}
              className="btn-secondary w-full text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resend invitation email to restaurant owner/manager"
            >
              {resending ? 'Sending...' : '📧 Resend Invitation Email'}
            </button>
          </div>

          {deleteError && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          {resendMessage && (
            <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              resendMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p>{resendMessage.text}</p>
              {resendMessage.link && (
                <div className="mt-2">
                  <p className="text-xs font-medium">Invitation Link:</p>
                  <a 
                    href={resendMessage.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs break-all text-primary-600 hover:underline"
                  >
                    {resendMessage.link}
                  </a>
                  {resendMessage.email && (
                    <p className="text-xs mt-1">Sent to: {resendMessage.email}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Edit Mode */}
          <div className="mb-4 border-b border-gray-200">
            <nav className="flex space-x-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twilio Phone Number *
                  </label>
                  <input
                    name="phoneNumber"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="+15551234567"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The Twilio phone number assigned to this restaurant for AI call routing.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twilio Number SID (Optional)
                  </label>
                  <input
                    name="twilioNumberSid"
                    value={form.twilioNumberSid}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Twilio's unique identifier for the phone number (starts with "PN"). 
                    Found in your Twilio Console under Phone Numbers → Manage → Active Numbers.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone *
                  </label>
                  <select
                    name="timezone"
                    value={form.timezone}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Phoenix">Arizona (MST)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      name="disabled"
                      type="checkbox"
                      checked={form.disabled}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Disabled</span>
                  </label>
                </div>
              </div>
            )}

            {/* Business Hours Tab */}
            {activeTab === 'hours' && (
              <div className="space-y-3">
                {DAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                    <div className="w-24 font-medium text-gray-700">{day.label}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={form.businessHours[day.key]?.open || '11:00'}
                        onChange={(e) => handleHoursChange(day.key, 'open', e.target.value)}
                        disabled={form.businessHours[day.key]?.closed}
                        className="input-field w-28"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={form.businessHours[day.key]?.close || '21:00'}
                        onChange={(e) => handleHoursChange(day.key, 'close', e.target.value)}
                        disabled={form.businessHours[day.key]?.closed}
                        className="input-field w-28"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
                      <input
                        type="checkbox"
                        checked={form.businessHours[day.key]?.closed || false}
                        onChange={(e) => handleHoursChange(day.key, 'closed', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Closed
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* AI Settings Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <select
                    name="model"
                    value={form.aiConfig.model}
                    onChange={handleAIConfigChange}
                    className="input-field"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast, Cost-effective)</option>
                    <option value="gpt-4o">GPT-4o (More Capable)</option>
                    <option value="gpt-5-realtime">GPT-5 Realtime (Future)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice Name
                  </label>
                  <select
                    name="voiceName"
                    value={form.aiConfig.voiceName}
                    onChange={handleAIConfigChange}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <input
                    name="language"
                    type="text"
                    value={form.aiConfig.language}
                    onChange={handleAIConfigChange}
                    className="input-field"
                    placeholder="en-US"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Language code (e.g., en-US, es-ES, fr-FR)
                  </p>
                </div>

                <div>
                  <PromptDropdown
                    value={form.aiConfig.systemPrompt || ''}
                    onChange={handlePromptChange}
                    voiceName={form.aiConfig.voiceName || 'alloy'}
                  />
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Addresses (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(form.notifyEmailAddresses) ? form.notifyEmailAddresses.join(', ') : form.notifyEmailAddresses || ''}
                    onChange={(e) => {
                      const emails = e.target.value.split(',').map((e) => e.trim()).filter(Boolean);
                      setForm((prev) => ({ ...prev, notifyEmailAddresses: emails }));
                    }}
                    className="input-field"
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS Numbers (comma-separated, E.164 format)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(form.notifySmsNumbers) ? form.notifySmsNumbers.join(', ') : form.notifySmsNumbers || ''}
                    onChange={(e) => {
                      const numbers = e.target.value.split(',').map((n) => n.trim()).filter(Boolean);
                      setForm((prev) => ({ ...prev, notifySmsNumbers: numbers }));
                    }}
                    className="input-field"
                    placeholder="+15551234567, +15559876543"
                  />
                </div>
              </div>
            )}

            {/* Menu Tab */}
            {activeTab === 'menu' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Manage menu items for {restaurant.name || 'this restaurant'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImportOpen(true)}
                      className="btn-secondary text-sm"
                    >
                      📥 Import CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleAddMenuItem}
                      className="btn-primary text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {menuError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {menuError}
                  </div>
                )}

                {menuLoading ? (
                  <div className="text-center py-8 text-gray-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4">Loading menu...</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <MenuTable
                      items={menu}
                      onEdit={handleEditMenuItem}
                      onDelete={handleDeleteMenuItem}
                      onToggleAvailability={handleToggleMenuItemAvailability}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-2 pt-4 border-t">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  // Reset form to original values
                  setForm({
                    name: restaurant?.name || '',
                    email: restaurant?.email || '',
                    phoneNumber: restaurant?.phoneNumber || '',
                    address: restaurant?.address || '',
                    timezone: restaurant?.timezone || 'America/Los_Angeles',
                    disabled: restaurant?.disabled || false,
                    businessHours: restaurant?.businessHours || form.businessHours,
                    aiConfig: restaurant?.aiConfig || form.aiConfig,
                    notifySmsNumbers: restaurant?.notifySmsNumbers || [],
                    notifyEmailAddresses: restaurant?.notifyEmailAddresses || [],
                    twilioNumberSid: restaurant?.twilioNumberSid || '',
                  });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Menu Item Form Modal */}
          <MenuItemForm
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditingItem(null);
            }}
            onSave={handleSaveMenuItem}
            editing={editingItem}
          />

          {/* Menu Import Modal */}
          {importOpen && (
            <MenuImport
              onImportComplete={loadMenu}
              onClose={() => setImportOpen(false)}
              createItemFn={(item) => createRestaurantMenuItem(restaurant.id || restaurant.restaurantId, item)}
            />
          )}

          {/* Delete Restaurant Confirmation Modal */}
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
            title="Delete Restaurant"
            message={`Are you sure you want to delete "${restaurant.name || restaurant.restaurantId}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={deleting}
          />

          {/* Delete Menu Item Confirmation Modal */}
          <ConfirmationModal
            isOpen={showDeleteMenuItemModal}
            onClose={() => {
              setShowDeleteMenuItemModal(false);
              setItemToDelete(null);
            }}
            onConfirm={confirmDeleteMenuItem}
            title="Delete Menu Item"
            message={itemToDelete ? `Are you sure you want to delete "${itemToDelete.name}"?` : ''}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
          />
        </>
      )}
    </div>
  );
}
