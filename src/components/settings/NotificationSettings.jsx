import { useState } from 'react';

export default function NotificationSettings({ settings, onSave, saving }) {
  const [sms, setSms] = useState(settings.notifySmsNumbers || []);
  const [email, setEmail] = useState(settings.notifyEmailAddresses || []);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      notifySmsNumbers: sms,
      notifyEmailAddresses: email,
    });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
      <p className="text-sm text-gray-600 mb-4">
        Configure where to send notifications for new orders, important calls, and alerts.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sms" className="block text-sm font-medium text-gray-700 mb-2">
            SMS Numbers (comma-separated)
          </label>
          <input
            id="sms"
            type="text"
            className="input-field"
            value={sms.join(', ')}
            onChange={(e) =>
              setSms(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="+15551234567, +15559876543"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter phone numbers in E.164 format (e.g., +15551234567)
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Addresses (comma-separated)
          </label>
          <input
            id="email"
            type="text"
            className="input-field"
            value={email.join(', ')}
            onChange={(e) =>
              setEmail(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="owner@restaurant.com, manager@restaurant.com"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Notifications'}
        </button>
      </form>
    </section>
  );
}

