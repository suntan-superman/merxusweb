const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function FlyoverHoursStep({ formData, onHoursChange }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Business Hours</h3>
        <p className="text-gray-600 text-sm">When is your AI available to take calls?</p>
      </div>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const hours = formData.businessHours[day];
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
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => onHoursChange(day, 'open', e.target.value)}
                    className="input-field !py-1.5 !px-2 w-28 text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => onHoursChange(day, 'close', e.target.value)}
                    className="input-field !py-1.5 !px-2 w-28 text-sm"
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
