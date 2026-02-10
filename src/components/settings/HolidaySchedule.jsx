import { useState } from 'react';

// Common US holidays with typical dates
const COMMON_HOLIDAYS = [
  { name: "New Year's Day", defaultDate: '01-01' },
  { name: "Martin Luther King Jr. Day", defaultDate: '01-20' },
  { name: "Presidents' Day", defaultDate: '02-17' },
  { name: "Memorial Day", defaultDate: '05-26' },
  { name: "Independence Day", defaultDate: '07-04' },
  { name: "Labor Day", defaultDate: '09-01' },
  { name: "Columbus Day", defaultDate: '10-13' },
  { name: "Veterans Day", defaultDate: '11-11' },
  { name: "Thanksgiving", defaultDate: '11-27' },
  { name: "Christmas Eve", defaultDate: '12-24' },
  { name: "Christmas Day", defaultDate: '12-25' },
  { name: "New Year's Eve", defaultDate: '12-31' },
];

/**
 * Holiday & Vacation Schedule Component
 * 
 * Allows businesses to set:
 * 1. Annual recurring holidays (Thanksgiving, Christmas, etc.)
 * 2. Custom one-time closures (renovation, vacation, etc.)
 * 3. Modified hours for specific dates
 * 
 * Props:
 * - settings: Current settings object (contains holidays array)
 * - onSave: Function to save updated settings
 * - saving: Boolean indicating save in progress
 * - tenantType: 'restaurant' | 'voice' | 'real_estate' (for customized labels)
 */
export default function HolidaySchedule({ settings, onSave, saving, tenantType = 'restaurant' }) {
  const existingHolidays = settings?.holidays || [];
  const existingClosures = settings?.customClosures || [];

  const [holidays, setHolidays] = useState(existingHolidays);
  const [customClosures, setCustomClosures] = useState(existingClosures);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showAddClosure, setShowAddClosure] = useState(false);

  // New holiday form state
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(true);
  const [newHolidayClosed, setNewHolidayClosed] = useState(true);
  const [newHolidayOpenTime, setNewHolidayOpenTime] = useState('');
  const [newHolidayCloseTime, setNewHolidayCloseTime] = useState('');

  // New closure form state
  const [newClosureName, setNewClosureName] = useState('');
  const [newClosureStartDate, setNewClosureStartDate] = useState('');
  const [newClosureEndDate, setNewClosureEndDate] = useState('');
  const [newClosureReason, setNewClosureReason] = useState('');

  const getLabel = (key) => {
    const labels = {
      restaurant: {
        title: 'Holiday & Closure Schedule',
        subtitle: 'Set holidays and vacation days when you\'ll be closed or have modified hours. The AI will inform callers automatically.',
        holidaysSection: 'Annual Holidays',
        closuresSection: 'Custom Closures & Vacations',
      },
      voice: {
        title: 'Holiday & Office Schedule',
        subtitle: 'Set office holidays and closures. The AI will inform callers and handle messages appropriately.',
        holidaysSection: 'Office Holidays',
        closuresSection: 'Custom Closures',
      },
      real_estate: {
        title: 'Holiday & Vacation Schedule',
        subtitle: 'Set holidays and vacation periods. The AI will inform callers and can route to backup agents if configured.',
        holidaysSection: 'Office Holidays',
        closuresSection: 'Agent Vacations & Closures',
      },
    };
    return labels[tenantType]?.[key] || labels.restaurant[key];
  };

  // Add a common holiday quickly
  const addCommonHoliday = (holiday) => {
    const currentYear = new Date().getFullYear();
    const newHoliday = {
      id: `holiday_${Date.now()}`,
      name: holiday.name,
      date: `${currentYear}-${holiday.defaultDate}`,
      recurring: true,
      closed: true,
      modifiedHours: null,
    };
    setHolidays([...holidays, newHoliday]);
  };

  // Add custom holiday
  const addCustomHoliday = () => {
    if (!newHolidayName || !newHolidayDate) return;

    const newHoliday = {
      id: `holiday_${Date.now()}`,
      name: newHolidayName,
      date: newHolidayDate,
      recurring: newHolidayRecurring,
      closed: newHolidayClosed,
      modifiedHours: newHolidayClosed ? null : {
        open: newHolidayOpenTime,
        close: newHolidayCloseTime,
      },
    };

    setHolidays([...holidays, newHoliday]);
    resetHolidayForm();
  };

  const resetHolidayForm = () => {
    setNewHolidayName('');
    setNewHolidayDate('');
    setNewHolidayRecurring(true);
    setNewHolidayClosed(true);
    setNewHolidayOpenTime('');
    setNewHolidayCloseTime('');
    setShowAddHoliday(false);
  };

  // Add custom closure/vacation
  const addCustomClosure = () => {
    if (!newClosureName || !newClosureStartDate) return;

    const newClosure = {
      id: `closure_${Date.now()}`,
      name: newClosureName,
      startDate: newClosureStartDate,
      endDate: newClosureEndDate || newClosureStartDate,
      reason: newClosureReason,
    };

    setCustomClosures([...customClosures, newClosure]);
    resetClosureForm();
  };

  const resetClosureForm = () => {
    setNewClosureName('');
    setNewClosureStartDate('');
    setNewClosureEndDate('');
    setNewClosureReason('');
    setShowAddClosure(false);
  };

  // Remove holiday
  const removeHoliday = (id) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  // Remove closure
  const removeClosure = (id) => {
    setCustomClosures(customClosures.filter(c => c.id !== id));
  };

  // Toggle holiday closed status
  const toggleHolidayClosed = (id) => {
    setHolidays(holidays.map(h => 
      h.id === id ? { ...h, closed: !h.closed, modifiedHours: !h.closed ? null : h.modifiedHours } : h
    ));
  };

  // Save all changes
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      holidays, 
      customClosures 
    });
  };

  // Filter out already added holidays
  const availableCommonHolidays = COMMON_HOLIDAYS.filter(
    ch => !holidays.some(h => h.name === ch.name)
  );

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{getLabel('title')}</h3>
      <p className="text-sm text-gray-600 mb-6">{getLabel('subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Annual Holidays Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-800">{getLabel('holidaysSection')}</h4>
            <button
              type="button"
              onClick={() => setShowAddHoliday(!showAddHoliday)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showAddHoliday ? '✕ Cancel' : '+ Add Holiday'}
            </button>
          </div>

          {/* Quick Add Common Holidays */}
          {availableCommonHolidays.length > 0 && !showAddHoliday && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {availableCommonHolidays.slice(0, 6).map((holiday) => (
                  <button
                    key={holiday.name}
                    type="button"
                    onClick={() => addCommonHoliday(holiday)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                  >
                    + {holiday.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Holiday Form */}
          {showAddHoliday && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Name
                  </label>
                  <input
                    type="text"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="e.g., Company Anniversary"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newHolidayRecurring}
                    onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Repeats annually
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newHolidayClosed}
                    onChange={(e) => setNewHolidayClosed(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Fully closed
                </label>
              </div>

              {!newHolidayClosed && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-600">Modified hours:</span>
                  <input
                    type="time"
                    value={newHolidayOpenTime}
                    onChange={(e) => setNewHolidayOpenTime(e.target.value)}
                    className="input-field w-32"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={newHolidayCloseTime}
                    onChange={(e) => setNewHolidayCloseTime(e.target.value)}
                    className="input-field w-32"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetHolidayForm}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addCustomHoliday}
                  disabled={!newHolidayName || !newHolidayDate}
                  className="btn-primary text-sm px-4 py-1.5"
                >
                  Add Holiday
                </button>
              </div>
            </div>
          )}

          {/* Holidays List */}
          {holidays.length > 0 ? (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {holiday.closed ? '🔴' : '🟡'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{holiday.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(holiday.date)}
                        {holiday.recurring && ' • Recurring'}
                        {!holiday.closed && holiday.modifiedHours && (
                          <span> • {holiday.modifiedHours.open} - {holiday.modifiedHours.close}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHolidayClosed(holiday.id)}
                      className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    >
                      {holiday.closed ? 'Set Modified Hours' : 'Mark Closed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHoliday(holiday.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No holidays configured yet.</p>
          )}
        </div>

        {/* Custom Closures Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-800">{getLabel('closuresSection')}</h4>
            <button
              type="button"
              onClick={() => setShowAddClosure(!showAddClosure)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showAddClosure ? '✕ Cancel' : '+ Add Closure'}
            </button>
          </div>

          {/* Add Closure Form */}
          {showAddClosure && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closure Name
                  </label>
                  <input
                    type="text"
                    value={newClosureName}
                    onChange={(e) => setNewClosureName(e.target.value)}
                    placeholder="e.g., Annual Vacation"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={newClosureReason}
                    onChange={(e) => setNewClosureReason(e.target.value)}
                    placeholder="e.g., Family vacation"
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newClosureStartDate}
                    onChange={(e) => setNewClosureStartDate(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newClosureEndDate}
                    onChange={(e) => setNewClosureEndDate(e.target.value)}
                    min={newClosureStartDate}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetClosureForm}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addCustomClosure}
                  disabled={!newClosureName || !newClosureStartDate}
                  className="btn-primary text-sm px-4 py-1.5"
                >
                  Add Closure
                </button>
              </div>
            </div>
          )}

          {/* Closures List */}
          {customClosures.length > 0 ? (
            <div className="space-y-2">
              {customClosures.map((closure) => (
                <div
                  key={closure.id}
                  className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏖️</span>
                    <div>
                      <div className="font-medium text-gray-900">{closure.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(closure.startDate)}
                        {closure.endDate !== closure.startDate && (
                          <span> – {formatDate(closure.endDate)}</span>
                        )}
                        {closure.reason && <span> • {closure.reason}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClosure(closure.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No custom closures scheduled.</p>
          )}
        </div>

        {/* Save Button */}
        <div className="border-t pt-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </form>
    </section>
  );
}

