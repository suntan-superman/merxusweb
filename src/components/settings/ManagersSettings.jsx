import { useState } from 'react';

export default function ManagersSettings({ settings, onSave, saving }) {
  const [managers, setManagers] = useState(settings.managers || []);
  const [showDialog, setShowDialog] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function handleAddManager() {
    if (managers.length >= 5) {
      alert('Maximum 5 managers allowed');
      return;
    }
    const newManager = {
      id: `manager_${Date.now()}`,
      name: '',
      phone: '',
      priority: managers.length + 1,
      availability: DAYS_OF_WEEK.reduce(
        (acc, day) => ({
          ...acc,
          [day.toLowerCase()]: {
            available: day !== 'Saturday' && day !== 'Sunday',
            startTime: '09:00',
            endTime: '17:00',
          },
        }),
        {}
      ),
    };
    setManagers([...managers, newManager]);
    openEditDialog(newManager, managers.length);
  }

  function handleRemoveManager(managerToRemove) {
    if (confirm('Remove this manager?')) {
      setManagers(managers.filter((m) => m.id !== managerToRemove.id));
    }
  }

  function formatPhoneNumber(phone) {
    // Remove non-digits except leading +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Format as +1 (XXX) XXX-XXXX if it's a US number
    if (cleaned.match(/^\+?1?\d{10}$/)) {
      const digits = cleaned.replace(/\D/g, '');
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return cleaned;
  }

  function openEditDialog(manager, index) {
    setEditingManager({ ...manager });
    setEditingIndex(index);
    setShowDialog(true);
  }

  function handleSaveAvailability() {
    if (!editingManager.name.trim()) {
      alert('Manager name is required');
      return;
    }
    if (!editingManager.phone.trim()) {
      alert('Phone number is required');
      return;
    }
    const cleanedPhone = editingManager.phone.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{10,}$/.test(cleanedPhone)) {
      alert('Invalid phone format. Please enter a valid phone number.');
      return;
    }

    const updated = [...managers];
    if (editingIndex < updated.length) {
      updated[editingIndex] = editingManager;
    }
    setManagers(updated);
    setShowDialog(false);
    setEditingManager(null);
    setEditingIndex(null);
  }

  function handleAvailabilityChange(day, field, value) {
    const updated = { ...editingManager };
    const dayKey = day.toLowerCase();
    updated.availability[dayKey] = {
      ...updated.availability[dayKey],
      [field]: value,
    };
    setEditingManager(updated);
  }


  function handleSubmit(e) {
    e.preventDefault();
    
    // Validate
    const errors = [];
    managers.forEach((manager, i) => {
      if (!manager.name.trim()) errors.push(`Manager ${i + 1}: Name required`);
      if (!manager.phone.trim()) errors.push(`Manager ${i + 1}: Phone required`);
      const cleanedPhone = manager.phone.replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,}$/.test(cleanedPhone)) {
        errors.push(`Manager ${i + 1}: Invalid phone format`);
      }
    });

    if (errors.length > 0) {
      alert('Please fix the following:\n' + errors.join('\n'));
      return;
    }

    onSave({ managers });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📞 Manager Availability</h3>
      <p className="text-sm text-gray-600 mb-6">
        Configure up to 5 managers for intelligent call routing. When a customer escalates, calls will be routed
        to available managers in priority order. If no one is available, escalation notifications are sent to all.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Manager Grid */}
        {managers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-4">No managers configured yet</p>
            <button
              type="button"
              onClick={handleAddManager}
              className="btn-primary"
            >
              Add First Manager
            </button>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Availability</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager, index) => {
                    const availableDays = DAYS_OF_WEEK.filter(
                      (day) => manager.availability[day.toLowerCase()].available
                    ).length;
                    return (
                      <tr key={manager.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{manager.priority}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{manager.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {manager.phone ? formatPhoneNumber(manager.phone) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {availableDays} days ({manager.availability[DAYS_OF_WEEK[0].toLowerCase()].startTime} -{' '}
                          {manager.availability[DAYS_OF_WEEK[0].toLowerCase()].endTime})
                        </td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditDialog(manager, index)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            ✎ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveManager(manager)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            ✕ Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Manager Button */}
        {managers.length > 0 && managers.length < 5 && (
          <button
            type="button"
            onClick={handleAddManager}
            className="w-full py-2 px-4 border-2 border-dashed border-primary-300 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors"
          >
            + Add Manager (Max 5)
          </button>
        )}

        {/* Save Button */}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Manager Settings'}
        </button>
      </form>

      {/* Edit Availability Modal */}
      {editingManager && showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[92vh] flex flex-col mx-4">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Availability - {editingManager.name || 'New Manager'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  setEditingManager(null);
                  setEditingIndex(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Manager Info - Single Row */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Manager Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="John"
                    value={editingManager.name}
                    onChange={(e) =>
                      setEditingManager({ ...editingManager, name: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+1 (661) 222-2222"
                    value={editingManager.phone}
                    onChange={(e) =>
                      setEditingManager({ ...editingManager, phone: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={editingManager.priority}
                    onChange={(e) =>
                      setEditingManager({
                        ...editingManager,
                        priority: parseInt(e.target.value),
                      })
                    }
                  >
                    {managers.map((_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Availability Grid */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Weekly Availability</h4>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayKey = day.toLowerCase();
                    const avail = editingManager.availability[dayKey];
                    return (
                      <div key={dayKey} className="flex items-center gap-2 py-1 border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={avail.available}
                          onChange={(e) =>
                            handleAvailabilityChange(day, 'available', e.target.checked)
                          }
                          className="w-4 h-4 accent-green-600 rounded cursor-pointer"
                        />
                        <label className="text-sm font-medium text-gray-700 w-24 cursor-pointer">{day}</label>

                        {avail.available && (
                          <div className="flex items-center gap-1 ml-auto">
                            <input
                              type="time"
                              value={avail.startTime}
                              onChange={(e) =>
                                handleAvailabilityChange(day, 'startTime', e.target.value)
                              }
                              className="w-36 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-500">to</span>
                            <input
                              type="time"
                              value={avail.endTime}
                              onChange={(e) =>
                                handleAvailabilityChange(day, 'endTime', e.target.value)
                              }
                              className="w-36 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        )}

                        {!avail.available && (
                          <span className="text-sm text-gray-500 ml-auto italic">Unavailable</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 justify-end border-t border-gray-200 p-6 bg-gray-50 sticky bottom-0">
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  setEditingManager(null);
                  setEditingIndex(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAvailability}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
              >
                Save Availability
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>💡 How it works:</strong> When a customer escalates, the AI will check manager availability in priority order.
          If the first manager is available during their scheduled hours, the call routes to them. Otherwise, it checks the next
          manager, and so on. If no manager is available, an urgent notification is sent to all managers.
        </p>
      </div>
    </section>
  );
}
