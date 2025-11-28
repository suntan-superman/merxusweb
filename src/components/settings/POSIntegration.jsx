import { useState } from 'react';

export default function POSIntegration({ settings, onSave, saving }) {
  const [provider, setProvider] = useState(settings.posIntegration?.provider || null);
  const [enabled, setEnabled] = useState(settings.posIntegration?.enabled || false);
  const [apiKey, setApiKey] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      posIntegration: {
        provider,
        enabled,
        ...(apiKey && { apiKey }), // Only include if provided
      },
    };
    onSave(payload);
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">POS Integration</h3>
      <p className="text-sm text-gray-600 mb-4">
        Connect your point-of-sale system to sync menu items and orders automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
            POS Provider
          </label>
          <select
            id="provider"
            className="input-field"
            value={provider || ''}
            onChange={(e) => setProvider(e.target.value || null)}
          >
            <option value="">None</option>
            <option value="square">Square</option>
            <option value="toast">Toast</option>
            <option value="clover">Clover</option>
          </select>
        </div>

        {provider && (
          <>
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                className="input-field"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your POS API key"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to keep existing key unchanged
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Enable automatic sync</span>
              </label>
            </div>
          </>
        )}

        <button type="submit" className="btn-primary" disabled={saving || !provider}>
          {saving ? 'Saving…' : 'Save Integration'}
        </button>
      </form>
    </section>
  );
}

