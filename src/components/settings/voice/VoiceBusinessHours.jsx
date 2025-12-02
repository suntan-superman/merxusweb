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

export default function VoiceBusinessHours({ settings, onSave, saving }) {
  const [hours, setHours] = useState(
    settings.businessHours || {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: false },
    }
  );

  function updateDay(day, field, value) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ businessHours: hours });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h3>
      <p className="text-sm text-gray-600 mb-4">
        Set your business hours to help the AI assistant inform callers about availability.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
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
                value={hours[day.key]?.close || '17:00'}
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

        <button type="submit" className="btn-primary mt-4" disabled={saving}>
          {saving ? 'Saving…' : 'Save Hours'}
        </button>
      </form>
    </section>
  );
}

