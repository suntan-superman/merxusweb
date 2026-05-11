import { useEffect, useMemo, useState } from 'react';
import { getSubscription } from '../api/billing';
import { useAuth } from '../context/AuthContext';

export const PLAN_ORDER = {
  base: 0,
  professional: 1,
  elite: 2,
};

const ELEVATED_PLAN_TIERS_ENABLED = import.meta.env.VITE_ELEVATED_PLAN_TIERS_ENABLED === 'true';

function normalizeSubscriptionTier(plan) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (!normalized) return 'base';
  if (!ELEVATED_PLAN_TIERS_ENABLED) return 'base';
  if (normalized.includes('elite') || normalized.includes('enterprise')) return 'elite';
  if (normalized.includes('professional') || /(^|[^a-z0-9])pro($|[^a-z0-9])/.test(normalized)) return 'professional';
  if (normalized.includes('standard') || normalized.includes('basic') || normalized.includes('starter') || normalized.includes('base')) return 'base';
  return 'base';
}

export function getTierLabel(tier) {
  if (tier === 'elite') return 'Elite';
  if (tier === 'professional') return 'Professional';
  return 'Basic';
}

export function meetsPlanRequirement(currentTier, requiredTier) {
  return (PLAN_ORDER[currentTier] ?? 0) >= (PLAN_ORDER[requiredTier] ?? 0);
}

function getEntitlements(tier) {
  const order = PLAN_ORDER[tier] ?? 0;
  return {
    professional: order >= PLAN_ORDER.professional,
    elite: order >= PLAN_ORDER.elite,
  };
}

function buildSummary(subscription = {}) {
  const tier = normalizeSubscriptionTier(subscription?.tier || subscription?.plan);
  return {
    ...subscription,
    tier,
    tierLabel: getTierLabel(tier),
    entitlements: getEntitlements(tier),
  };
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
