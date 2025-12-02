import { useState } from 'react';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function EstateBusinessHours({ settings, onSave, saving }) {
  const [hours, setHours] = useState(
    settings.businessHours || {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: null, close: null, closed: true },
    }
  );

  const [showingPrefs, setShowingPrefs] = useState(
    settings.showingPreferences || {
      minNoticeHours: 2,
      allowSameDay: true,
      blockOff: [],
    }
  );

  function updateDay(day, field, value) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function handleShowingPrefChange(field, value) {
    setShowingPrefs((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      businessHours: hours,
      showingPreferences: showingPrefs,
    });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours & Showing Preferences</h3>
      <p className="text-sm text-gray-600 mb-4">
        Set your business hours and showing preferences to help the AI assistant schedule appointments.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">Business Hours</h4>
          <div className="space-y-3">
            {DAYS.map((day) => (
              <div key={day.key} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                <div className="w-24 font-medium text-gray-700">{day.label}</div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[day.key]?.open || '09:00'}
                    onChange={(e) => updateDay(day.key, 'open', e.target.value)}
                    disabled={hours[day.key]?.closed}
                    className="input-field w-28"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={hours[day.key]?.close || '18:00'}
                    onChange={(e) => updateDay(day.key, 'close', e.target.value)}
                    disabled={hours[day.key]?.closed}
                    className="input-field w-28"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
                  <input
                    type="checkbox"
                    checked={hours[day.key]?.closed || false}
                    onChange={(e) => updateDay(day.key, 'closed', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Showing Preferences</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="minNoticeHours" className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Notice Required (hours)
              </label>
              <input
                id="minNoticeHours"
                name="minNoticeHours"
                type="number"
                min="0"
                value={showingPrefs.minNoticeHours || 2}
                onChange={(e) => handleShowingPrefChange('minNoticeHours', parseInt(e.target.value, 10))}
                className="input-field w-32"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum number of hours notice required before scheduling a showing
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showingPrefs.allowSameDay || false}
                  onChange={(e) => handleShowingPrefChange('allowSameDay', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Allow same-day showings
              </label>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary mt-4" disabled={saving}>
          {saving ? 'Saving…' : 'Save Hours & Preferences'}
        </button>
      </form>
    </section>
  );
}

