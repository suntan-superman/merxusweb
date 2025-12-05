import ToastPOSSettings from './TOASTPOSSettings';

export default function POSIntegration() {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">POS Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect your point-of-sale system to sync menu items and orders automatically.
        </p>
      </div>

      {/* Toast POS Integration */}
      <ToastPOSSettings />

      {/* Placeholder for future integrations */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Coming Soon</h4>
        <p className="text-xs text-gray-600 mb-2">We're adding support for more POS systems:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Square</li>
          <li>• Clover</li>
          <li>• Lightspeed</li>
        </ul>
      </div>
    </section>
  );
}

