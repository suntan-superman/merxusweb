import { useEffect, useState } from 'react';
import {
  fetchRestaurantBookingSettings,
  updateRestaurantBookingSettings,
} from '../../api/restaurantBookings';
import LoadingSpinner from '../../components/LoadingSpinner';

const DEFAULT_SETTINGS = {
  enabled: true,
  restaurantName: '',
  timezone: 'America/Los_Angeles',
  defaultBookingDurationMinutes: 90,
  bookingIntervalMinutes: 30,
  minAdvanceMinutes: 60,
  maxAdvanceDays: 180,
  allowAiAutoConfirmSmallParties: true,
  autoConfirmMaxPartySize: 6,
  largePartyThreshold: 8,
  privateEventThreshold: 15,
  smsConfirmationsEnabled: true,
  emailConfirmationsEnabled: true,
  smsRemindersEnabled: true,
  reminderHoursBefore: 24,
  staffNotificationChannels: {
    dashboard: true,
    mobilePush: true,
    sms: false,
    slack: false,
  },
};

export default function RestaurantBookingSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const loaded = await fetchRestaurantBookingSettings();
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(loaded || {}),
        staffNotificationChannels: {
          ...DEFAULT_SETTINGS.staffNotificationChannels,
          ...(loaded?.staffNotificationChannels || {}),
        },
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load booking settings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...settings,
        defaultBookingDurationMinutes: Number(settings.defaultBookingDurationMinutes || 90),
        bookingIntervalMinutes: Number(settings.bookingIntervalMinutes || 30),
        minAdvanceMinutes: Number(settings.minAdvanceMinutes || 0),
        maxAdvanceDays: Number(settings.maxAdvanceDays || 1),
        autoConfirmMaxPartySize: Number(settings.autoConfirmMaxPartySize || 1),
        largePartyThreshold: Number(settings.largePartyThreshold || 1),
        privateEventThreshold: Number(settings.privateEventThreshold || 1),
        reminderHoursBefore: Number(settings.reminderHoursBefore || 1),
      };
      const saved = await updateRestaurantBookingSettings(payload);
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(saved || payload),
        staffNotificationChannels: {
          ...DEFAULT_SETTINGS.staffNotificationChannels,
          ...((saved || payload).staffNotificationChannels || {}),
        },
      });
      setSuccess('Booking settings saved.');
    } catch (err) {
      console.error(err);
      setError('Failed to save booking settings.');
    } finally {
      setSaving(false);
    }
  }

  function patch(next) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function patchChannel(key, value) {
    setSettings((current) => ({
      ...current,
      staffNotificationChannels: {
        ...(current.staffNotificationChannels || {}),
        [key]: value,
      },
    }));
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking settings..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Booking Rules
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Booking Settings</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Control AI auto-confirmation, booking windows, reminders, and staff notification channels.
        </p>
      </div>

      {error ? <Alert tone="red">{error}</Alert> : null}
      {success ? <Alert tone="green">{success}</Alert> : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">General</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField label="Restaurant name" value={settings.restaurantName || ''} onChange={(value) => patch({ restaurantName: value })} />
          <TextField label="Timezone" value={settings.timezone || ''} onChange={(value) => patch({ timezone: value })} />
          <NumberField label="Default duration minutes" value={settings.defaultBookingDurationMinutes} onChange={(value) => patch({ defaultBookingDurationMinutes: value })} min="15" />
          <NumberField label="Booking interval minutes" value={settings.bookingIntervalMinutes} onChange={(value) => patch({ bookingIntervalMinutes: value })} min="5" />
        </div>
        <div className="mt-4">
          <ToggleField label="Bookings enabled" checked={settings.enabled !== false} onChange={(checked) => patch({ enabled: checked })} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">AI Approval Rules</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <NumberField label="Minimum advance minutes" value={settings.minAdvanceMinutes} onChange={(value) => patch({ minAdvanceMinutes: value })} min="0" />
          <NumberField label="Maximum advance days" value={settings.maxAdvanceDays} onChange={(value) => patch({ maxAdvanceDays: value })} min="1" />
          <NumberField label="Auto-confirm max party size" value={settings.autoConfirmMaxPartySize} onChange={(value) => patch({ autoConfirmMaxPartySize: value })} min="1" />
          <NumberField label="Large party threshold" value={settings.largePartyThreshold} onChange={(value) => patch({ largePartyThreshold: value })} min="1" />
          <NumberField label="Private event threshold" value={settings.privateEventThreshold} onChange={(value) => patch({ privateEventThreshold: value })} min="1" />
        </div>
        <div className="mt-4">
          <ToggleField
            label="Allow AI to auto-confirm eligible small parties"
            checked={settings.allowAiAutoConfirmSmallParties !== false}
            onChange={(checked) => patch({ allowAiAutoConfirmSmallParties: checked })}
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Customer Confirmations</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ToggleField label="Send confirmation SMS" checked={settings.smsConfirmationsEnabled !== false} onChange={(checked) => patch({ smsConfirmationsEnabled: checked })} />
          <ToggleField label="Send confirmation email" checked={settings.emailConfirmationsEnabled !== false} onChange={(checked) => patch({ emailConfirmationsEnabled: checked })} />
          <ToggleField label="Send reminder SMS" checked={settings.smsRemindersEnabled !== false} onChange={(checked) => patch({ smsRemindersEnabled: checked })} />
          <NumberField label="Reminder hours before booking" value={settings.reminderHoursBefore} onChange={(value) => patch({ reminderHoursBefore: value })} min="1" />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Staff Notifications</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ToggleField label="Dashboard notifications" checked={settings.staffNotificationChannels?.dashboard !== false} onChange={(checked) => patchChannel('dashboard', checked)} />
          <ToggleField label="Mobile push notifications" checked={settings.staffNotificationChannels?.mobilePush !== false} onChange={(checked) => patchChannel('mobilePush', checked)} />
          <ToggleField label="Staff SMS notifications" checked={settings.staffNotificationChannels?.sms === true} onChange={(checked) => patchChannel('sms', checked)} />
          <ToggleField label="Slack notifications" checked={settings.staffNotificationChannels?.slack === true} onChange={(checked) => patchChannel('slack', checked)} />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Booking Settings'}
        </button>
      </div>
    </form>
  );
}

function Alert({ tone, children }) {
  const styles = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200';
  return <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, min }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
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
