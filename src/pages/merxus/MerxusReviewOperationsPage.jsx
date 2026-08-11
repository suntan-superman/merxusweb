import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchReviewOperationsHealth, rerunReviewOperationsSync } from '../../api/reviews';

function Stat({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function MerxusReviewOperationsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rerunKey, setRerunKey] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setReport(await fetchReviewOperationsHealth());
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError.message || 'Unable to load review operations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function rerun(tenant, platform) {
    const key = `${tenant.tenantType}:${tenant.tenantId}:${platform}`;
    try {
      setRerunKey(key);
      const result = await rerunReviewOperationsSync({
        tenantId: tenant.tenantId,
        tenantType: tenant.tenantType,
        platform,
      });
      if (result.failed) throw new Error(result.results?.find((item) => item.success === false)?.error || 'Review sync failed.');
      toast.success(`${platform} sync completed.`);
      await load();
    } catch (syncError) {
      toast.error(syncError?.response?.data?.error || syncError.message || 'Review sync failed.');
    } finally {
      setRerunKey('');
    }
  }

  if (loading && !report) return <div className="p-8 text-sm text-slate-600">Loading review operations…</div>;

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Merxus Operations</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Review Integration Health</h1>
          <p className="mt-2 text-sm text-slate-600">Cross-tenant onboarding, connection, sync, and import readiness.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Review tenants" value={report?.summary?.tenants || 0} helper={`${report?.summary?.connectedInstallations || 0} active provider installation(s)`} />
        <Stat label="Wizard completion" value={`${report?.summary?.selfServiceCompletionRate || 0}%`} helper={`${report?.summary?.onboardingCompleted || 0} complete of ${report?.summary?.onboardingStarted || 0} started`} />
        <Stat label="Needs attention" value={report?.summary?.onboardingNeedsAttention || 0} helper="Onboarding records requiring intervention" />
        <Stat label="Latest sync failures" value={report?.summary?.latestSyncFailures || 0} helper={`${report?.summary?.providerReviewsImported || 0} provider reviews stored`} />
        <Stat label="Negative alerts" value={report?.summary?.pendingNegativeAlerts || 0} helper="Pending operator/customer attention" />
        <Stat label="Approved replies" value={report?.summary?.approvedUnpostedReplies || 0} helper="Approved but not yet provider-verified" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(report?.providers || []).map((provider) => (
          <div key={provider.provider} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold capitalize text-slate-900">{provider.provider}</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{String(provider.rolloutStage || 'disabled').replaceAll('_', ' ')}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>Connected tenants: <strong className="text-slate-900">{provider.connectedTenants}</strong></p>
              <p>Healthy latest runs: <strong className="text-slate-900">{provider.healthyTenants}</strong></p>
              <p>Failed latest runs: <strong className="text-slate-900">{provider.failedTenants}</strong></p>
              <p>Reconnect required: <strong className="text-slate-900">{provider.reconnectRequired || 0}</strong></p>
              <p>Pending negative alerts: <strong className="text-slate-900">{provider.pendingNegativeAlerts || 0}</strong></p>
              <p>Approved / unposted: <strong className="text-slate-900">{provider.approvedUnpostedReplies || 0}</strong></p>
              <p>Imported reviews: <strong className="text-slate-900">{provider.reviewsImported}</strong></p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold text-slate-900">Tenant health</h2><p className="mt-1 text-sm text-slate-600">Attention items are sorted first. Manual reruns use the same locking and history path as scheduled syncs.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Wizard</th><th className="px-5 py-3">Providers</th><th className="px-5 py-3">Operational detail</th><th className="px-5 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(report?.tenants || []).map((tenant) => {
                const providerHealth = tenant.providerHealth || [];
                return <tr key={`${tenant.tenantType}:${tenant.tenantId}`} className={tenant.needsAttention ? 'bg-amber-50/60' : ''}><td className="px-5 py-4"><p className="font-semibold text-slate-900">{tenant.tenantName || tenant.tenantId}</p><p className="text-xs text-slate-500">{tenant.tenantType} • {tenant.tenantId}</p></td><td className="px-5 py-4 capitalize text-slate-700">{String(tenant.onboardingStatus || '').replaceAll('_', ' ')} <span className="text-xs text-slate-500">(step {tenant.onboardingStep})</span></td><td className="px-5 py-4 text-slate-700">{tenant.providers.join(', ') || 'None'}</td><td className="px-5 py-4">{providerHealth.length ? providerHealth.map((health) => <div key={health.provider} className="mb-3 max-w-xl"><p><span className="font-semibold capitalize">{health.provider}:</span> <span className={health.latestSyncStatus === 'failed' || health.reconnectRequired ? 'text-red-700' : 'text-emerald-700'}>{health.reconnectRequired ? 'reconnect required' : health.latestSyncStatus}</span> <span className="text-xs text-slate-500">• {health.rolloutStage}</span></p><p className="text-xs text-slate-500">{health.reviewCount} reviews ({health.newReviewCount} new) • {health.pendingNegativeAlerts} negative alerts • {health.approvedUnpostedReplies} approved replies • failures {health.consecutiveFailures}</p><p className="text-xs text-slate-500">Last: {health.lastSyncAt ? new Date(health.lastSyncAt).toLocaleString() : 'never'} • Next: {health.nextSyncAt ? new Date(health.nextSyncAt).toLocaleString() : 'not scheduled'}</p>{health.error ? <p className="max-w-md text-xs text-red-600">{health.error}</p> : null}</div>) : <span className="text-slate-500">No connected providers</span>}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{tenant.providers.map((platform) => { const key = `${tenant.tenantType}:${tenant.tenantId}:${platform}`; return <button key={platform} type="button" onClick={() => rerun(tenant, platform)} disabled={Boolean(rerunKey)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold capitalize disabled:opacity-50">{rerunKey === key ? 'Running…' : `Sync ${platform}`}</button>; })}</div></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
