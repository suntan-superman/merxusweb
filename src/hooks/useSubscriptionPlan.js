import { useEffect, useMemo, useState } from 'react';
import { getSubscription } from '../api/billing';
import { useAuth } from '../context/AuthContext';
import {
  PLAN_ORDER,
  buildSubscriptionSummary,
  getTierLabel,
  meetsPlanRequirement,
} from '../utils/subscriptionPlan';

export { PLAN_ORDER, getTierLabel, meetsPlanRequirement };

const ELEVATED_PLAN_TIERS_ENABLED = import.meta.env.VITE_ELEVATED_PLAN_TIERS_ENABLED === 'true';

function buildSummary(subscription = {}) {
  return buildSubscriptionSummary(subscription, {
    elevatedPlanTiersEnabled: ELEVATED_PLAN_TIERS_ENABLED,
  });
}

let cachedTenantId = null;
let cachedSummary = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

export default function useSubscriptionPlan({ enabled = true } = {}) {
  const { user, tenantId } = useAuth();
  const [subscription, setSubscription] = useState(() => (
    cachedTenantId && cachedTenantId === tenantId && cachedSummary ? cachedSummary : null
  ));
  const [loading, setLoading] = useState(enabled && !(cachedTenantId === tenantId && cachedSummary));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled || !user || !tenantId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      const cacheIsFresh =
        cachedTenantId === tenantId &&
        cachedSummary &&
        Date.now() - cacheTimestamp < CACHE_TTL_MS;
      if (cacheIsFresh) {
        if (!cancelled) {
          setSubscription(cachedSummary);
          setLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setLoading(true);
          setError('');
        }

        const data = await getSubscription();
        const summary = buildSummary(data || {});
        cachedTenantId = tenantId;
        cachedSummary = summary;
        cacheTimestamp = Date.now();

        if (!cancelled) {
          setSubscription(summary);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.error || 'Failed to load subscription plan.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, tenantId, user]);

  const entitlements = useMemo(
    () => subscription?.entitlements || { professional: false, elite: false },
    [subscription]
  );

  return {
    subscription,
    tier: subscription?.tier || 'base',
    tierLabel: subscription?.tierLabel || 'Basic',
    entitlements,
    loading,
    error,
    refresh: async () => {
      cachedSummary = null;
      cachedTenantId = null;
      cacheTimestamp = 0;
      try {
        setLoading(true);
        setError('');
        const data = await getSubscription();
        const summary = buildSummary(data || {});
        cachedTenantId = tenantId;
        cachedSummary = summary;
        cacheTimestamp = Date.now();
        setSubscription(summary);
      } catch (refreshError) {
        setError(refreshError?.response?.data?.error || 'Failed to load subscription plan.');
      } finally {
        setLoading(false);
      }
    },
  };
}
