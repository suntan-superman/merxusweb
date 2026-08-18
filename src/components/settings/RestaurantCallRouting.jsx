import { useMemo, useState } from 'react';

const DAY_LABELS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];

const DEFAULT_FALLBACK = {
  mode: 'callback',
  notifyGroupKey: 'manager_contacts',
  messageEn: "I'm sorry, no one is available to take the call right now. I have notified the team and someone will call you back as soon as possible. Thank you for calling.",
  messageEs: 'Lo siento, no hay nadie disponible para atender la llamada en este momento. He avisado al equipo y alguien le devolverá la llamada lo antes posible. Gracias por llamar.',
};

function defaultAvailability() {
  return Object.fromEntries(DAY_LABELS.map(([day]) => [
    day,
    {
      available: day !== 'saturday' && day !== 'sunday',
      startTime: '09:00',
      endTime: '17:00',
    },
  ]));
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(value || '').trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

function initialRouting(settings = {}) {
  const source = settings.routing || {};
  return {
    liveTransfersEnabled: source.liveTransfersEnabled === true,
    requireCallerDetailsBeforeTransfer: source.requireCallerDetailsBeforeTransfer !== false,
    transferTimeoutSeconds: Number(source.transferTimeoutSeconds || 20),
    departments: Array.isArray(source.departments)
      ? source.departments.map((destination, index) => ({
          id: destination.id || `route_${index + 1}`,
          label: destination.label || `Destination ${index + 1}`,
          role: destination.role || (String(destination.id || '').includes('manager') ? 'manager' : 'staff'),
          forward_to: destination.forward_to || '',
          enabled: destination.enabled !== false,
          priority: Number.isFinite(Number(destination.priority)) ? Number(destination.priority) : index,
          availabilityMode: destination.availabilityMode || 'business_hours',
          availability: {
            ...defaultAvailability(),
            ...(destination.availability || {}),
          },
        }))
      : [],
    fallback: {
      ...DEFAULT_FALLBACK,
      ...(source.fallback || {}),
      mode: 'callback',
      notifyGroupKey: 'manager_contacts',
    },
  };
}

function makeDestination(index, role = 'manager') {
  return {
    id: `${role}_${Date.now()}_${index}`,
    label: role === 'manager' ? 'Manager' : 'General Staff',
    role,
    forward_to: '',
    enabled: true,
    priority: index,
    availabilityMode: 'business_hours',
    availability: defaultAvailability(),
  };
}

export default function RestaurantCallRouting({ settings, onSave, saving }) {
  const [routing, setRouting] = useState(() => initialRouting(settings));
  const [error, setError] = useState('');
  const inboundNumber = settings.twilioPhoneNumber || '';
  const normalizedInbound = useMemo(() => normalizePhone(inboundNumber), [inboundNumber]);

  function updateRouting(field, value) {
    setRouting((current) => ({ ...current, [field]: value }));
  }

  function updateDestination(index, field, value) {
    setRouting((current) => ({
      ...current,
      departments: current.departments.map((destination, destinationIndex) =>
        destinationIndex === index ? { ...destination, [field]: value } : destination
      ),
    }));
  }

  function updateAvailability(index, day, field, value) {
    setRouting((current) => ({
      ...current,
      departments: current.departments.map((destination, destinationIndex) =>
        destinationIndex === index
          ? {
              ...destination,
              availability: {
                ...destination.availability,
                [day]: {
                  ...destination.availability?.[day],
                  [field]: value,
                },
              },
            }
          : destination
      ),
    }));
  }

  function addDestination(role = 'manager') {
    if (routing.departments.length >= 5) return;
    setRouting((current) => ({
      ...current,
      departments: [...current.departments, makeDestination(current.departments.length, role)],
    }));
  }

  function removeDestination(index) {
    setRouting((current) => ({
      ...current,
      departments: current.departments
        .filter((_, destinationIndex) => destinationIndex !== index)
        .map((destination, priority) => ({ ...destination, priority })),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const activeDestinations = routing.departments.filter((destination) => destination.enabled);
    const normalizedPhones = activeDestinations.map((destination) => normalizePhone(destination.forward_to));
    if (routing.liveTransfersEnabled && activeDestinations.length === 0) {
      setError('Add and enable at least one manager or staff destination before enabling live transfers.');
      return;
    }
    if (routing.liveTransfersEnabled && normalizedPhones.some((phone) => !phone)) {
      setError('Every enabled destination must have a valid phone number, including country code.');
      return;
    }
    if (normalizedPhones.some((phone) => phone && phone === normalizedInbound)) {
      setError("A transfer destination cannot be the restaurant's Merxus AI number.");
      return;
    }
    if (new Set(normalizedPhones.filter(Boolean)).size !== normalizedPhones.filter(Boolean).length) {
      setError('Each enabled destination must use a different phone number.');
      return;
    }

    onSave({
      routing: {
        ...routing,
        transferTimeoutSeconds: Math.min(60, Math.max(10, Number(routing.transferTimeoutSeconds || 20))),
        departments: routing.departments.map((destination, priority) => ({
          ...destination,
          forward_to: normalizePhone(destination.forward_to),
          priority,
        })),
        fallback: {
          ...routing.fallback,
          mode: 'callback',
          notifyGroupKey: 'manager_contacts',
        },
      },
    });
  }

  return (
    <section className="card space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Live Call Routing</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
          Transfer callers to a manager or staff member when someone is available. Failed transfers automatically become callback requests for Manager Contacts.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-100">
        Transfer destinations are separate from notification recipients. Keep the recipient in <a className="font-semibold underline" href="/restaurant/users">Team &amp; Access</a> phone-verified and assigned to Manager Contacts so the fallback SMS/email alert can be delivered.
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-slate-700">
          <input
            type="checkbox"
            checked={routing.liveTransfersEnabled}
            onChange={(event) => updateRouting('liveTransfersEnabled', event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-900 dark:text-slate-100">Enable live manager and staff transfers</span>
            <span className="block text-xs text-gray-500 dark:text-slate-400">This is intentionally opt-in. When disabled or outside the configured schedule, Merxus captures a callback request.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-slate-700">
          <input
            type="checkbox"
            checked={routing.requireCallerDetailsBeforeTransfer}
            onChange={(event) => updateRouting('requireCallerDetailsBeforeTransfer', event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-900 dark:text-slate-100">Require caller name and reason before transferring</span>
            <span className="block text-xs text-gray-500 dark:text-slate-400">Recommended so staff know who is calling and why, even if the transfer is unanswered.</span>
          </span>
        </label>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-slate-100">Transfer destinations</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">Merxus evaluates enabled destinations in priority order.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={routing.departments.length >= 5} onClick={() => addDestination('manager')}>+ Manager</button>
              <button type="button" className="btn-secondary" disabled={routing.departments.length >= 5} onClick={() => addDestination('staff')}>+ Staff</button>
            </div>
          </div>

          {routing.departments.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
              No live-transfer destinations are configured. Merxus will offer a callback instead.
            </div>
          ) : routing.departments.map((destination, index) => (
            <div key={destination.id} className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-slate-700">
              <div className="grid gap-4 lg:grid-cols-12">
                <label className="lg:col-span-1 flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <input type="checkbox" checked={destination.enabled} onChange={(event) => updateDestination(index, 'enabled', event.target.checked)} />
                  On
                </label>
                <label className="lg:col-span-3 text-sm text-gray-700 dark:text-slate-300">
                  Label
                  <input className="input-field mt-1" value={destination.label} onChange={(event) => updateDestination(index, 'label', event.target.value)} placeholder="Manager" />
                </label>
                <label className="lg:col-span-2 text-sm text-gray-700 dark:text-slate-300">
                  Role
                  <select className="input-field mt-1" value={destination.role} onChange={(event) => updateDestination(index, 'role', event.target.value)}>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>
                <label className="lg:col-span-3 text-sm text-gray-700 dark:text-slate-300">
                  Phone
                  <input className="input-field mt-1" type="tel" value={destination.forward_to || ''} onChange={(event) => updateDestination(index, 'forward_to', event.target.value)} placeholder="+16615551234" />
                </label>
                <label className="lg:col-span-2 text-sm text-gray-700 dark:text-slate-300">
                  Availability
                  <select className="input-field mt-1" value={destination.availabilityMode} onChange={(event) => updateDestination(index, 'availabilityMode', event.target.value)}>
                    <option value="business_hours">Business hours</option>
                    <option value="custom">Custom schedule</option>
                    <option value="always">Always</option>
                  </select>
                </label>
                <div className="lg:col-span-1 flex items-end justify-end">
                  <button type="button" className="text-sm font-medium text-red-600 hover:underline dark:text-red-300" onClick={() => removeDestination(index)}>Remove</button>
                </div>
              </div>

              {destination.availabilityMode === 'custom' ? (
                <div className="grid gap-2 border-t border-gray-200 pt-4 dark:border-slate-700 md:grid-cols-2 xl:grid-cols-3">
                  {DAY_LABELS.map(([day, label]) => {
                    const schedule = destination.availability?.[day] || {};
                    return (
                      <div key={day} className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-xs dark:border-slate-700">
                        <label className="flex min-w-24 items-center gap-2 text-gray-700 dark:text-slate-300">
                          <input type="checkbox" checked={schedule.available !== false} onChange={(event) => updateAvailability(index, day, 'available', event.target.checked)} />
                          {label}
                        </label>
                        <input type="time" className="input-field py-1 text-xs" disabled={schedule.available === false} value={schedule.startTime || '09:00'} onChange={(event) => updateAvailability(index, day, 'startTime', event.target.value)} />
                        <span className="text-gray-400">to</span>
                        <input type="time" className="input-field py-1 text-xs" disabled={schedule.available === false} value={schedule.endTime || '17:00'} onChange={(event) => updateAvailability(index, day, 'endTime', event.target.value)} />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-4 rounded-xl border border-gray-200 p-4 dark:border-slate-700 md:grid-cols-2">
          <label className="text-sm text-gray-700 dark:text-slate-300">
            Ring timeout (seconds)
            <input className="input-field mt-1" type="number" min="10" max="60" value={routing.transferTimeoutSeconds} onChange={(event) => updateRouting('transferTimeoutSeconds', Number(event.target.value))} />
          </label>
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-slate-900 dark:text-slate-300">
            If the destination is busy, declines, fails, or does not answer within this time, Merxus records a manager callback request and alerts Manager Contacts.
          </div>
          <label className="text-sm text-gray-700 dark:text-slate-300 md:col-span-2">
            No-answer message (English)
            <textarea className="input-field mt-1" rows="3" value={routing.fallback.messageEn} onChange={(event) => updateRouting('fallback', { ...routing.fallback, messageEn: event.target.value })} />
          </label>
          <label className="text-sm text-gray-700 dark:text-slate-300 md:col-span-2">
            No-answer message (Spanish)
            <textarea className="input-field mt-1" rows="3" value={routing.fallback.messageEs} onChange={(event) => updateRouting('fallback', { ...routing.fallback, messageEs: event.target.value })} />
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Call Routing'}
        </button>
      </form>
    </section>
  );
}
