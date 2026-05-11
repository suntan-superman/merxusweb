import ToastPOSSettings from './TOASTPOSSettings';
import PlanGateCard from '../billing/PlanGateCard';
import useSubscriptionPlan from '../../hooks/useSubscriptionPlan';

export default function POSIntegration() {
  const { entitlements, loading } = useSubscriptionPlan();

  if (loading) {
    return (
      <section className="space-y-4">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-slate-100">POS Integration</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
            Checking plan access...
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-slate-100">POS Integration</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
          Connect your point-of-sale system to sync menu items and orders automatically.
        </p>
      </div>

      {entitlements.professional ? (
        <ToastPOSSettings />
      ) : (
        <PlanGateCard
          requiredTier="professional"
          title="Toast POS is a Professional feature"
          description="Basic accounts can manage restaurant profile, menu, bookings, calls, and SMS. Toast POS menu sync and AI order push are Professional-level integrations and will unlock after Professional billing is enabled for this tenant."
          actionPath="/restaurant/billing?requiredTier=professional&from=%2Frestaurant%2Fsettings%3Ftab%3Dpos"
        />
      )}

      {/* Placeholder for future integrations */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Coming Soon</h4>
        <p className="mb-2 text-xs text-gray-600 dark:text-slate-300">We're adding support for more POS systems:</p>
        <ul className="space-y-1 text-xs text-gray-500 dark:text-slate-400">
          <li>• Square</li>
          <li>• Clover</li>
          <li>• Lightspeed</li>
        </ul>
      </div>
    </section>
  );
}

