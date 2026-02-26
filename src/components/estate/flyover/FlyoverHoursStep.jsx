import TimePickerField from '../../common/TimePickerField';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '14:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true },
};

export default function FlyoverHoursStep({ formData, onHoursChange }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Business Hours</h3>
        <p className="text-gray-600 text-sm">When is your AI available to take calls?</p>
      </div>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const hours = formData.businessHours?.[day] || DEFAULT_BUSINESS_HOURS[day];
          return (
            <div key={day} className="flex items-center gap-3">
              <div className="w-24">
                <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!hours.closed}
                  onChange={(e) => onHoursChange(day, 'closed', !e.target.checked)}
                  className="w-4 h-4 checkbox-green rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Open</span>
              </label>
              {!hours.closed && (
                <>
                  <TimePickerField
                    value={hours.open}
                    onChange={(e) => onHoursChange(day, 'open', e.target.value)}
                    className="input-field time-field !py-1.5 !px-2 text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <TimePickerField
                    value={hours.close}
                    onChange={(e) => onHoursChange(day, 'close', e.target.value)}
                    className="input-field time-field !py-1.5 !px-2 text-sm"
                  />
                </>
              )}
              {hours.closed && (
                <span className="text-sm text-gray-400 italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Outside these hours, your AI will take messages and schedule callbacks.
      </p>
    </div>
  );
}

