import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  dismissMergeCandidate,
  fetchCustomer360,
  fetchGraphCustomers,
  mergeGraphCustomers,
  mergeGraphProperties,
} from '../../api/graph';

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Customer 360',
      subtitle: 'Track cross-channel guest history, unresolved intake items, and structured reservation or order activity.',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'Customer 360',
      subtitle: 'Track lead history, property interest, and unresolved inquiry follow-up across calls and SMS.',
    };
  }
  return {
    title: 'Customer 360',
    subtitle: 'Track caller history, unresolved service intake, and structured quote or appointment activity across channels.',
  };
}

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

function formatEventLabel(value) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatPropertyCandidateLabel(snapshot = {}) {
  return snapshot?.address || snapshot?.normalizedAddress || snapshot?.listingId || snapshot?.mlsNumber || 'Possible duplicate property';
}

function actionLabelForMergeHistory(candidate = {}) {
  if (candidate.status === 'merged') {
    return {
      label: 'Merged',
      timestamp: candidate.mergedAt,
      actor: candidate.mergedBy,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }

  return {
    label: 'Dismissed',
    timestamp: candidate.dismissedAt,
    actor: candidate.dismissedBy,
    tone: 'border-slate-200 bg-slate-50 text-slate-900',
  };
}

function actionLabelForMergeAudit(audit = {}) {
  return audit.action === 'merged'
    ? {
        label: 'Merged',
        timestamp: audit.createdAt,
        actor: audit.actor,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      }
    : {
        label: 'Dismissed',
        timestamp: audit.createdAt,
        actor: audit.actor,
        tone: 'border-slate-200 bg-slate-50 text-slate-900',
      };
}

function formatAffectedCounts(affectedCounts = {}) {
  return Object.entries(affectedCounts || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([key, count]) => `${key.replace(/_/g, ' ')}: ${count}`)
    .join(' · ');
}

export default function Customer360Workspace({ tenantType, basePath }) {
  const copy = copyForTenant(tenantType);
  const navigate = useNavigate();
  const location = useLocation();
  const { customerId } = useParams();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [mergeActionId, setMergeActionId] = useState('');
  const searchParams = new URLSearchParams(location.search);
  const focusedSection = searchParams.get('section') || '';
  const focusedObjectId = searchParams.get('focusId') || '';

  useEffect(() => {
    if (!detail?.customer || !focusedSection) {
      return;
    }

    const targetId = focusedObjectId
      ? `customer-360-item-${focusedSection}-${focusedObjectId}`
      : `customer-360-section-${focusedSection}`;

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [detail?.customer, focusedObjectId, focusedSection]);

  async function loadCustomers({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoadingList(true);
      setError('');
      const response = await fetchGraphCustomers({
        search: search || undefined,
        limit: 80,
      });
      setCustomers(response.customers || []);
      setCustomerSummary(response.summary || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load customers.');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (customerId || !customers.length) return;
    navigate(`${basePath}/${customers[0].id}`, { replace: true });
  }, [basePath, customerId, customers, navigate]);

  useEffect(() => {
    if (!customerId) {
      setDetail(null);
      return;
    }

    let active = true;
    async function loadDetail() {
      try {
        setLoadingDetail(true);
        setError('');
        const response = await fetchCustomer360(customerId, { timelineLimit: 40 });
        if (!active) return;
        setDetail(response);
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load customer detail.');
        setDetail(null);
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [customerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) || detail?.customer || null,
    [customerId, customers, detail]
  );

  function openCustomer(nextCustomerId) {
    navigate(`${basePath}/${nextCustomerId}`);
  }

  async function handleSearchSubmit(event) {
    event.preventDefault();
    await loadCustomers();
  }

  async function handleMergeCandidate(candidate) {
    try {
      setMergeActionId(candidate.id);
      setError('');
      await mergeGraphCustomers({
        candidateId: candidate.id,
        primaryCustomerId: candidate.primaryId,
        duplicateCustomerId: candidate.duplicateId,
      });
      await loadCustomers({ silent: true });
      const nextCustomerId = customerId === candidate.duplicateId ? candidate.primaryId : customerId;
      if (nextCustomerId && nextCustomerId !== customerId) {
        navigate(`${basePath}/${nextCustomerId}`, { replace: true });
      } else if (nextCustomerId) {
        const response = await fetchCustomer360(nextCustomerId, { timelineLimit: 40 });
        setDetail(response);
      }
    } catch (actionError) {
      setError(actionError?.response?.data?.error || actionError?.message || 'Failed to merge customer profiles.');
    } finally {
      setMergeActionId('');
    }
  }

  async function handleDismissCandidate(candidateId) {
    try {
      setMergeActionId(candidateId);
      setError('');
      await dismissMergeCandidate(candidateId);
      if (customerId) {
        const response = await fetchCustomer360(customerId, { timelineLimit: 40 });
        setDetail(response);
      }
      await loadCustomers({ silent: true });
    } catch (actionError) {
      setError(actionError?.response?.data?.error || actionError?.message || 'Failed to dismiss merge candidate.');
    } finally {
      setMergeActionId('');
    }
  }

  async function handleMergePropertyCandidate(candidate) {
    try {
      setMergeActionId(candidate.id);
      setError('');
      await mergeGraphProperties({
        candidateId: candidate.id,
        primaryPropertyId: candidate.primaryId,
        duplicatePropertyId: candidate.duplicateId,
      });
      if (customerId) {
        const response = await fetchCustomer360(customerId, { timelineLimit: 40 });
        setDetail(response);
      }
      await loadCustomers({ silent: true });
    } catch (actionError) {
      setError(actionError?.response?.data?.error || actionError?.message || 'Failed to merge property records.');
    } finally {
      setMergeActionId('');
    }
  }

  const summaryCards = [
    { label: 'Customers', value: customerSummary?.total || 0 },
    { label: 'With Phone', value: customerSummary?.withPhone || 0 },
    { label: 'With Email', value: customerSummary?.withEmail || 0 },
    { label: 'Unresolved', value: detail?.summary?.unresolvedCount || 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">UBKG Foundation</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              placeholder="Search by name, phone, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Search
            </button>
          </form>
          <button
            type="button"
            onClick={() => loadCustomers({ silent: true })}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Customer Graph</h2>
              <p className="text-sm text-slate-500">
                {customers.length} customer{customers.length === 1 ? '' : 's'} in the current view
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loadingList ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading customers…
              </div>
            ) : null}

            {!loadingList && customers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No customer profiles match the current search.
              </div>
            ) : null}

            {!loadingList && customers.map((customer) => (
              <button
                type="button"
                key={customer.id}
                onClick={() => openCustomer(customer.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedCustomer?.id === customer.id
                    ? 'border-sky-300 bg-sky-50/70'
                    : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {customer.displayName || customer.phone || customer.email || 'Unknown customer'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {customer.phone || 'No phone'}
                      {customer.email ? ` · ${customer.email}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {customer.stats?.eventCount || 0} event{customer.stats?.eventCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(customer.channels || []).map((channel) => (
                    <span
                      key={`${customer.id}-${channel}`}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                    >
                      {channel.toUpperCase()}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Last interaction {formatTimestamp(customer.lastInteractionAt)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {loadingDetail ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading customer detail…
            </div>
          ) : null}

          {!loadingDetail && detail?.customer ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                    {detail.tenantType?.replace(/_/g, ' ') || tenantType}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {detail.customer.displayName || detail.customer.phone || detail.customer.email || 'Unknown customer'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {detail.customer.phone || 'No phone'}
                    {detail.customer.email ? ` · ${detail.customer.email}` : ''}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>First seen {formatTimestamp(detail.customer.firstSeenAt)}</p>
                  <p className="mt-1">Last interaction {formatTimestamp(detail.customer.lastInteractionAt)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <SummaryCard label="Interactions" value={detail.summary?.totalEvents || 0} />
                <SummaryCard label="Pending Review" value={detail.summary?.pendingReviewCount || 0} />
                <SummaryCard label="Schema Issues" value={detail.summary?.schemaIssueCount || 0} />
                <SummaryCard label="Related Objects" value={Object.values(detail.summary?.linkedObjectCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0)} />
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.92fr,1.08fr]">
                <div className="space-y-6">
                  <DetailSection title="Contact Methods">
                    <div className="flex flex-wrap gap-2">
                      {(detail.contactMethods || []).map((contact) => (
                        <span
                          key={`${contact.type}-${contact.value}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {contact.type}: {contact.value}
                        </span>
                      ))}
                      {!detail.contactMethods?.length ? (
                        <span className="text-sm text-slate-500">No contact methods on record.</span>
                      ) : null}
                    </div>
                  </DetailSection>

                  <DetailSection title="Interaction Mix">
                    <div className="space-y-2">
                      {(detail.summary?.byEventType || []).slice(0, 6).map((item) => (
                        <div key={item.eventType} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                          <span className="text-slate-700">{formatEventLabel(item.eventType)}</span>
                          <span className="font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                      {!detail.summary?.byEventType?.length ? (
                        <p className="text-sm text-slate-500">No event history yet.</p>
                      ) : null}
                    </div>
                  </DetailSection>

                  <DetailSection title="Potential Duplicates">
                    <div className="space-y-3">
                      {(detail.mergeCandidates || []).map((candidate) => {
                        const otherProfile = candidate.primaryId === detail.customer.id
                          ? candidate.duplicateSnapshot
                          : candidate.primarySnapshot;
                        return (
                          <div key={candidate.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-amber-900">
                                  {otherProfile?.displayName || otherProfile?.phone || otherProfile?.email || 'Possible duplicate'}
                                </p>
                                <p className="mt-1 text-xs text-amber-800">
                                  {otherProfile?.phone || 'No phone'}
                                  {otherProfile?.email ? ` · ${otherProfile.email}` : ''}
                                </p>
                                <p className="mt-2 text-xs text-amber-700">
                                  Reason: {formatEventLabel(candidate.reason)} · Confidence {(Number(candidate.confidence || 0) * 100).toFixed(0)}%
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMergeCandidate(candidate)}
                                  disabled={Boolean(mergeActionId)}
                                  className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                                >
                                  {mergeActionId === candidate.id ? 'Merging…' : 'Merge'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDismissCandidate(candidate.id)}
                                  disabled={Boolean(mergeActionId)}
                                  className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                                >
                                  {mergeActionId === candidate.id ? 'Saving…' : 'Dismiss'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!detail.mergeCandidates?.length ? (
                        <p className="text-sm text-slate-500">No active duplicate candidates for this customer.</p>
                      ) : null}
                    </div>
                  </DetailSection>

                  <DetailSection title="Recent Duplicate Decisions">
                    <div className="space-y-3">
                      {(detail.mergeHistory || []).map((candidate) => {
                        const otherProfile = candidate.primaryId === detail.customer.id
                          ? candidate.duplicateSnapshot
                          : candidate.primarySnapshot;
                        const action = actionLabelForMergeHistory(candidate);
                        return (
                          <div key={candidate.id} className={`rounded-2xl border p-4 ${action.tone}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">
                                  {otherProfile?.displayName || otherProfile?.phone || otherProfile?.email || 'Duplicate decision'}
                                </p>
                                <p className="mt-1 text-xs opacity-80">
                                  {otherProfile?.phone || 'No phone'}
                                  {otherProfile?.email ? ` · ${otherProfile.email}` : ''}
                                </p>
                                <p className="mt-2 text-xs opacity-80">
                                  Reason: {formatEventLabel(candidate.reason)} · Confidence {(Number(candidate.confidence || 0) * 100).toFixed(0)}%
                                </p>
                              </div>
                              <div className="text-right text-xs opacity-80">
                                <p className="font-semibold">{action.label}</p>
                                <p className="mt-1">{formatTimestamp(action.timestamp)}</p>
                                <p className="mt-1">{action.actor?.email || action.actor?.uid || 'Unknown operator'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!detail.mergeHistory?.length ? (
                        <p className="text-sm text-slate-500">No recent duplicate decisions for this customer.</p>
                      ) : null}
                    </div>
                  </DetailSection>

                  <DetailSection title="Merge Audit Trail">
                    <div className="space-y-3">
                      {(detail.mergeAuditTrail || []).map((audit) => {
                        const action = actionLabelForMergeAudit(audit);
                        return (
                          <div key={audit.id} className={`rounded-2xl border p-4 ${action.tone}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">
                                  {audit.primaryId === detail.customer.id ? 'This customer was kept as primary' : 'This customer was merged or reviewed as duplicate'}
                                </p>
                                <p className="mt-1 text-xs opacity-80">
                                  Reason: {formatEventLabel(audit.reason)}{audit.confidence ? ` · Confidence ${(Number(audit.confidence || 0) * 100).toFixed(0)}%` : ''}
                                </p>
                                {formatAffectedCounts(audit.affectedCounts) ? (
                                  <p className="mt-2 text-xs opacity-80">
                                    Impact: {formatAffectedCounts(audit.affectedCounts)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right text-xs opacity-80">
                                <p className="font-semibold">{action.label}</p>
                                <p className="mt-1">{formatTimestamp(action.timestamp)}</p>
                                <p className="mt-1">{action.actor?.email || action.actor?.uid || 'Unknown operator'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!detail.mergeAuditTrail?.length ? (
                        <p className="text-sm text-slate-500">No customer merge audit entries for this profile yet.</p>
                      ) : null}
                    </div>
                  </DetailSection>

                  {tenantType === 'real_estate' ? (
                    <>
                      <DetailSection title="Potential Property Duplicates">
                        <div className="space-y-3">
                          {(detail.propertyMergeCandidates || []).map((candidate) => {
                            const primarySnapshot = candidate.primarySnapshot || {};
                            const duplicateSnapshot = candidate.duplicateSnapshot || {};
                            const focusMatchesPrimary = focusedObjectId && candidate.primaryId === focusedObjectId;
                            const focusMatchesDuplicate = focusedObjectId && candidate.duplicateId === focusedObjectId;
                            return (
                              <div
                                key={candidate.id}
                                className={`rounded-2xl border p-4 ${
                                  focusMatchesPrimary || focusMatchesDuplicate
                                    ? 'border-sky-300 bg-sky-50'
                                    : 'border-blue-200 bg-blue-50'
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {formatPropertyCandidateLabel(primarySnapshot)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      Primary
                                      {primarySnapshot.listingId ? ` · listing ${primarySnapshot.listingId}` : ''}
                                      {primarySnapshot.mlsNumber ? ` · MLS ${primarySnapshot.mlsNumber}` : ''}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-700">
                                      Duplicate: {formatPropertyCandidateLabel(duplicateSnapshot)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {duplicateSnapshot.listingId ? `listing ${duplicateSnapshot.listingId}` : 'No listing ID'}
                                      {duplicateSnapshot.mlsNumber ? ` · MLS ${duplicateSnapshot.mlsNumber}` : ''}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                      Reason: {formatEventLabel(candidate.reason)} · Confidence {(Number(candidate.confidence || 0) * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleMergePropertyCandidate(candidate)}
                                      disabled={Boolean(mergeActionId)}
                                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      {mergeActionId === candidate.id ? 'Merging…' : 'Merge'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDismissCandidate(candidate.id)}
                                      disabled={Boolean(mergeActionId)}
                                      className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                    >
                                      {mergeActionId === candidate.id ? 'Saving…' : 'Dismiss'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {!detail.propertyMergeCandidates?.length ? (
                            <p className="text-sm text-slate-500">No active property duplicate candidates for this customer.</p>
                          ) : null}
                        </div>
                      </DetailSection>

                      <DetailSection title="Recent Property Duplicate Decisions">
                        <div className="space-y-3">
                          {(detail.propertyMergeHistory || []).map((candidate) => {
                            const primarySnapshot = candidate.primarySnapshot || {};
                            const duplicateSnapshot = candidate.duplicateSnapshot || {};
                            const action = actionLabelForMergeHistory(candidate);
                            return (
                              <div key={candidate.id} className={`rounded-2xl border p-4 ${action.tone}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {formatPropertyCandidateLabel(primarySnapshot)}
                                    </p>
                                    <p className="mt-1 text-xs opacity-80">
                                      Duplicate: {formatPropertyCandidateLabel(duplicateSnapshot)}
                                    </p>
                                    <p className="mt-2 text-xs opacity-80">
                                      Reason: {formatEventLabel(candidate.reason)} · Confidence {(Number(candidate.confidence || 0) * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                  <div className="text-right text-xs opacity-80">
                                    <p className="font-semibold">{action.label}</p>
                                    <p className="mt-1">{formatTimestamp(action.timestamp)}</p>
                                    <p className="mt-1">{action.actor?.email || action.actor?.uid || 'Unknown operator'}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {!detail.propertyMergeHistory?.length ? (
                            <p className="text-sm text-slate-500">No recent property duplicate decisions for this customer.</p>
                          ) : null}
                        </div>
                      </DetailSection>

                      <DetailSection title="Property Merge Audit Trail">
                        <div className="space-y-3">
                          {(detail.propertyMergeAuditTrail || []).map((audit) => {
                            const action = actionLabelForMergeAudit(audit);
                            return (
                              <div key={audit.id} className={`rounded-2xl border p-4 ${action.tone}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {audit.snapshots?.primarySnapshot?.address || audit.primaryId || 'Property audit'}
                                    </p>
                                    <p className="mt-1 text-xs opacity-80">
                                      Duplicate: {audit.snapshots?.duplicateSnapshot?.address || audit.duplicateId || 'Unknown property'}
                                    </p>
                                    <p className="mt-2 text-xs opacity-80">
                                      Reason: {formatEventLabel(audit.reason)}{audit.confidence ? ` · Confidence ${(Number(audit.confidence || 0) * 100).toFixed(0)}%` : ''}
                                    </p>
                                    {formatAffectedCounts(audit.affectedCounts) ? (
                                      <p className="mt-2 text-xs opacity-80">
                                        Impact: {formatAffectedCounts(audit.affectedCounts)}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-xs opacity-80">
                                    <p className="font-semibold">{action.label}</p>
                                    <p className="mt-1">{formatTimestamp(action.timestamp)}</p>
                                    <p className="mt-1">{action.actor?.email || action.actor?.uid || 'Unknown operator'}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {!detail.propertyMergeAuditTrail?.length ? (
                            <p className="text-sm text-slate-500">No property merge audit entries for this customer yet.</p>
                          ) : null}
                        </div>
                      </DetailSection>
                    </>
                  ) : null}

                  <DetailSection title="Related Business Objects">
                    <div className="space-y-3">
                      <RelatedEntityList
                        label="Reservations"
                        items={detail.relatedEntities?.reservations}
                        sectionKey="reservations"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => `${item.date || 'Date TBD'} at ${item.time || 'Time TBD'} · party of ${item.partySize || '—'}`}
                      />
                      <RelatedEntityList
                        label="Orders"
                        items={detail.relatedEntities?.orders}
                        sectionKey="orders"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => `${item.fulfillmentType || 'order'}${item.targetTime ? ` · ${item.targetTime}` : ''}`}
                      />
                      <RelatedEntityList
                        label="Appointments"
                        items={detail.relatedEntities?.appointments}
                        sectionKey="appointments"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => `${item.requestedDate || 'Date TBD'}${item.requestedTime ? ` · ${item.requestedTime}` : ''}`}
                      />
                      <RelatedEntityList
                        label="Quotes"
                        items={detail.relatedEntities?.quotes}
                        sectionKey="quotes"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => `${item.serviceRequested || item.serviceType || 'Quote request'}${item.propertyAddress ? ` · ${item.propertyAddress}` : ''}`}
                      />
                      <RelatedEntityList
                        label="Service Requests"
                        items={detail.relatedEntities?.serviceRequests}
                        sectionKey="serviceRequests"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => `${formatEventLabel(item.requestType || item.requestTypeLabel || 'service_request')}${item.urgency ? ` · ${item.urgency}` : ''}`}
                      />
                      <RelatedEntityList
                        label="Properties"
                        items={detail.relatedEntities?.properties}
                        sectionKey="properties"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => item.address || 'Unknown property'}
                      />
                      <RelatedEntityList
                        label="Showings"
                        items={detail.relatedEntities?.showings}
                        sectionKey="showings"
                        focusedSection={focusedSection}
                        focusedObjectId={focusedObjectId}
                        renderItem={(item) => `${item.propertyAddress || item.address || 'Property TBD'}${item.requestedDate ? ` · ${item.requestedDate}` : ''}${item.requestedTime ? ` ${item.requestedTime}` : ''}`}
                      />
                    </div>
                  </DetailSection>
                </div>

                <DetailSection title="Timeline">
                  <div className="space-y-3">
                    {(detail.timeline || []).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {item.channel}
                              </span>
                              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                {formatEventLabel(item.eventType)}
                              </span>
                              {item.reviewStatus === 'pending_review' ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  Pending review
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              {item.rawSummary || item.rawText || 'No summary available.'}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{formatTimestamp(item.createdAt)}</p>
                            <p className="mt-1">Confidence {(Number(item.confidence || 0) * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        {item.validation?.issues?.length ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {item.validation.issues.map((issue) => formatEventLabel(issue)).join(' • ')}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {!detail.timeline?.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                        No linked interaction history yet.
                      </div>
                    ) : null}
                  </div>
                </DetailSection>
              </div>
            </div>
          ) : null}

          {!loadingDetail && !detail?.customer ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Select a customer to inspect their interaction timeline and linked structured events.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RelatedEntityList({ label, items = [], renderItem, sectionKey = '', focusedSection = '', focusedObjectId = '' }) {
  const isFocusedSection = sectionKey === focusedSection;
  const visibleItems = useMemo(() => {
    if (!items.length) {
      return [];
    }

    if (isFocusedSection) {
      return items;
    }

    if (focusedObjectId && items.some((item) => item.id === focusedObjectId)) {
      return items.slice(0, 4).some((item) => item.id === focusedObjectId)
        ? items.slice(0, 4)
        : [...items.slice(0, 3), items.find((item) => item.id === focusedObjectId)].filter(Boolean);
    }

    return items.slice(0, 4);
  }, [focusedObjectId, isFocusedSection, items]);

  return (
    <div
      id={`customer-360-section-${sectionKey}`}
      className={`rounded-2xl px-3 py-3 transition ${
        isFocusedSection ? 'border border-sky-200 bg-sky-50/60' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        {isFocusedSection ? (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Focused
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-2">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <div
              key={`${label}-${item.id || item.eventId || item.address || item.propertyAddress || 'item'}`}
              id={item.id ? `customer-360-item-${sectionKey}-${item.id}` : undefined}
              className={`rounded-2xl px-3 py-2 text-sm ${
                focusedObjectId && item.id === focusedObjectId
                  ? 'border border-sky-300 bg-sky-50 text-sky-900'
                  : 'bg-slate-50 text-slate-700'
              }`}
            >
              {renderItem(item)}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No linked {label.toLowerCase()} yet.</p>
        )}
      </div>
    </div>
  );
}
