import { useEffect, useMemo, useState } from 'react';
import {
  createRestaurantBookingArea,
  fetchRestaurantBookingAreas,
  updateRestaurantBookingArea,
} from '../../api/restaurantBookings';
import LoadingSpinner from '../../components/LoadingSpinner';

const AREA_TYPES = [
  { value: 'main_dining', label: 'Main Dining' },
  { value: 'banquet_room', label: 'Banquet Room' },
  { value: 'patio', label: 'Patio' },
  { value: 'private_room', label: 'Private Room' },
  { value: 'bar_lounge', label: 'Bar / Lounge' },
  { value: 'full_venue', label: 'Full Venue' },
  { value: 'other', label: 'Other' },
];

const EMPTY_AREA = {
  name: '',
  type: 'main_dining',
  active: true,
  capacityMin: '',
  capacityMax: 20,
  defaultDurationMinutes: 90,
  requiresManagerApproval: false,
  allowAiAutoConfirm: true,
  displayOrder: 0,
  notes: '',
};

export default function RestaurantBookingAreasPage() {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(EMPTY_AREA);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAreas();
  }, []);

  async function loadAreas() {
    setLoading(true);
    setError('');
    try {
      setAreas(await fetchRestaurantBookingAreas());
    } catch (err) {
      console.error(err);
      setError('Failed to load booking areas.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(area) {
    setEditingId(area.areaId || area.id);
    setForm({
      ...EMPTY_AREA,
      ...area,
      capacityMin: area.capacityMin ?? '',
      capacityMax: area.capacityMax ?? 1,
      defaultDurationMinutes: area.defaultDurationMinutes ?? 90,
      displayOrder: area.displayOrder ?? 0,
      notes: area.notes || '',
    });
    setSuccess('');
    setError('');
  }

  function resetForm() {
    setEditingId('');
    setForm(EMPTY_AREA);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        capacityMin: form.capacityMin === '' ? undefined : Number(form.capacityMin),
        capacityMax: Number(form.capacityMax || 1),
        defaultDurationMinutes: Number(form.defaultDurationMinutes || 90),
        displayOrder: Number(form.displayOrder || 0),
      };
      const saved = editingId
        ? await updateRestaurantBookingArea(editingId, payload)
        : await createRestaurantBookingArea(payload);

      if (saved) {
        setAreas((current) => {
          const id = saved.areaId || saved.id;
          const exists = current.some((item) => (item.areaId || item.id) === id);
          return exists
            ? current.map((item) => ((item.areaId || item.id) === id ? saved : item))
            : [...current, saved];
        });
      } else {
        await loadAreas();
      }
      setSuccess(editingId ? 'Area updated.' : 'Area created.');
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Failed to save booking area.');
    } finally {
      setSaving(false);
    }
  }

  const sortedAreas = useMemo(() => [...areas].sort((left, right) => {
    const orderDiff = Number(left.displayOrder || 0) - Number(right.displayOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(left.name || '').localeCompare(String(right.name || ''));
  }), [areas]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Booking Resources
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Areas</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Define dining rooms, patios, private rooms, and venue resources the AI can book or route for review.
        </p>
      </div>

      {error ? <Alert tone="red">{error}</Alert> : null}
      {success ? <Alert tone="green">{success}</Alert> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Configured Areas</h3>
          </div>
          {loading ? (
            <div className="p-6"><LoadingSpinner text="Loading areas..." /></div>
          ) : sortedAreas.length ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {sortedAreas.map((area) => (
                <button
                  key={area.areaId || area.id}
                  type="button"
                  onClick={() => startEdit(area)}
                  className="grid w-full gap-3 px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800 md:grid-cols-[1fr_140px_130px_120px]"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-slate-100">{area.name}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{area.notes || 'No notes'}</div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-slate-300">{formatType(area.type)}</div>
                  <div className="text-sm text-gray-700 dark:text-slate-300">Up to {area.capacityMax || 0}</div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${area.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {area.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
              No booking areas yet.
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {editingId ? 'Edit Area' : 'New Area'}
            </h3>
            {editingId ? (
              <button type="button" onClick={resetForm} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
                Clear
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <SelectField label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={AREA_TYPES} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Capacity min" value={form.capacityMin} onChange={(value) => setForm({ ...form, capacityMin: value })} min="0" />
              <NumberField label="Capacity max" value={form.capacityMax} onChange={(value) => setForm({ ...form, capacityMax: value })} min="1" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Duration minutes" value={form.defaultDurationMinutes} onChange={(value) => setForm({ ...form, defaultDurationMinutes: value })} min="15" required />
              <NumberField label="Display order" value={form.displayOrder} onChange={(value) => setForm({ ...form, displayOrder: value })} />
            </div>
            <ToggleField label="Active" checked={form.active !== false} onChange={(checked) => setForm({ ...form, active: checked })} />
            <ToggleField label="Requires manager approval" checked={form.requiresManagerApproval} onChange={(checked) => setForm({ ...form, requiresManagerApproval: checked })} />
            <ToggleField label="AI can auto-confirm" checked={form.allowAiAutoConfirm !== false} onChange={(checked) => setForm({ ...form, allowAiAutoConfirm: checked })} />
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Save Area' : 'Create Area'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Alert({ tone, children }) {
  const styles = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200';
  return <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

function TextField({ label, value, onChange, required = false }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, min, required = false }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 dark:border-slate-700 dark:text-slate-300">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />
    </label>
  );
}

function formatType(value) {
  return String(value || 'other').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
