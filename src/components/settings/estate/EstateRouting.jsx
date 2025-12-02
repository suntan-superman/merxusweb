import { useState } from 'react';

export default function EstateRouting({ settings, onSave, saving }) {
  const [routing, setRouting] = useState(
    settings.routing || {
      departments: [
        { id: 'new_buyers', label: 'New Buyer Leads', forward_to: null },
        { id: 'sellers', label: 'Potential Sellers', forward_to: null },
        { id: 'showings', label: 'Showing Requests', forward_to: null },
        { id: 'general', label: 'General Questions', forward_to: null },
        { id: 'voicemail', label: 'Voicemail / Inbox', forward_to: null },
      ],
      intents: [
        { name: 'listing_info', routes_to: 'new_buyers' },
        { name: 'showing_request', routes_to: 'showings' },
        { name: 'seller_lead', routes_to: 'sellers' },
        { name: 'general_question', routes_to: 'general' },
        { name: 'after_hours', routes_to: 'voicemail' },
      ],
      after_hours: {
        mode: 'voicemail_only',
        default_route: 'voicemail',
        message_en: 'Thanks for calling. Our office is currently closed. I can take a message and have someone contact you as soon as possible.',
        message_es: 'Gracias por llamar. En este momento la oficina está cerrada. Puedo tomar un mensaje para que alguien se comunique con usted lo antes posible.',
      },
    }
  );

  function updateDepartment(index, field, value) {
    setRouting((prev) => ({
      ...prev,
      departments: prev.departments.map((dept, i) =>
        i === index ? { ...dept, [field]: value } : dept
      ),
    }));
  }

  function updateIntent(index, field, value) {
    setRouting((prev) => ({
      ...prev,
      intents: prev.intents.map((intent, i) =>
        i === index ? { ...intent, [field]: value } : intent
      ),
    }));
  }

  function updateAfterHours(field, value) {
    setRouting((prev) => ({
      ...prev,
      after_hours: {
        ...prev.after_hours,
        [field]: value,
      },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ routing });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Routing</h3>
      <p className="text-sm text-gray-600 mb-4">
        Configure how calls are routed to different departments and how the AI handles after-hours calls.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">Departments</h4>
          <div className="space-y-3">
            {routing.departments.map((dept, index) => (
              <div key={dept.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{dept.label}</div>
                  <div className="text-xs text-gray-500 mt-1">ID: {dept.id}</div>
                </div>
                <div className="w-64">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Forward To (Phone Number)
                  </label>
                  <input
                    type="tel"
                    value={dept.forward_to || ''}
                    onChange={(e) => updateDepartment(index, 'forward_to', e.target.value)}
                    className="input-field text-sm"
                    placeholder="+15551234567"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to take a message instead of transferring
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Intent Mapping</h4>
          <p className="text-sm text-gray-600 mb-3">
            Map caller intents to departments. The AI will use this to route calls appropriately.
          </p>
          <div className="space-y-2">
            {routing.intents.map((intent, index) => (
              <div key={index} className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{intent.name}</span>
                </div>
                <span className="text-gray-500">→</span>
                <select
                  value={intent.routes_to}
                  onChange={(e) => updateIntent(index, 'routes_to', e.target.value)}
                  className="input-field text-sm w-48"
                >
                  {routing.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">After-Hours Handling</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="afterHoursMode" className="block text-sm font-medium text-gray-700 mb-2">
                Mode
              </label>
              <select
                id="afterHoursMode"
                value={routing.after_hours.mode}
                onChange={(e) => updateAfterHours('mode', e.target.value)}
                className="input-field"
              >
                <option value="voicemail_only">Voicemail Only</option>
                <option value="emergency_or_voicemail">Emergency or Voicemail</option>
              </select>
            </div>

            <div>
              <label htmlFor="afterHoursMessageEn" className="block text-sm font-medium text-gray-700 mb-2">
                After-Hours Message (English)
              </label>
              <textarea
                id="afterHoursMessageEn"
                rows="3"
                value={routing.after_hours.message_en}
                onChange={(e) => updateAfterHours('message_en', e.target.value)}
                className="input-field"
                placeholder="Thanks for calling..."
              />
            </div>

            <div>
              <label htmlFor="afterHoursMessageEs" className="block text-sm font-medium text-gray-700 mb-2">
                After-Hours Message (Spanish)
              </label>
              <textarea
                id="afterHoursMessageEs"
                rows="3"
                value={routing.after_hours.message_es}
                onChange={(e) => updateAfterHours('message_es', e.target.value)}
                className="input-field"
                placeholder="Gracias por llamar..."
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Routing Configuration'}
        </button>
      </form>
    </section>
  );
}

