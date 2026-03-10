import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGraphObjectDetail, fetchGraphObjects, updateGraphObject } from '../../api/graph';
import { fetchInteractionEventDetail, fetchInteractionEventSource } from '../../api/intelligence';
import { useAuth } from '../../context/AuthContext';

const TYPE_OPTIONS = [
  { value: '', label: 'All work items' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'quote', label: 'Quotes' },
  { value: 'service_request', label: 'Service Requests' },
];

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function formatObjectType(value) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function summarizeObject(object) {
  if (!object) return 'No summary available.';
  if (object.objectType === 'appointment') {
    return `${object.appointmentType || 'Appointment'}${object.requestedDate ? ` · ${object.requestedDate}` : ''}${object.requestedTime ? ` ${object.requestedTime}` : ''}`;
  }
  if (object.objectType === 'quote') {
    return `${object.serviceType || 'Quote request'}${object.propertyAddress ? ` · ${object.propertyAddress}` : ''}`;
  }
  return `${formatObjectType(object.requestType || object.objectType)}${object.summary ? ` · ${object.summary}` : ''}`;
}

function DetailCard({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-2 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export default function VoiceWorkItemsWorkspace() {
  const navigate = useNavigate();
  const { user, userClaims } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type') || '';
  const requestedId = searchParams.get('id') || '';

  const [filters, setFilters] = useState({
    objectType: requestedType,
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(requestedId);
  const [sourceEventDetail, setSourceEventDetail] = useState(null);
  const [sourceEventContext, setSourceEventContext] = useState(null);
  const [loadingSourceEvent, setLoadingSourceEvent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingObject, setUpdatingObject] = useState(false);

  async function loadObjects({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      const response = await fetchGraphObjects({
        objectType: filters.objectType || undefined,
        search: filters.search || undefined,
        limit: 120,
      });
      setObjects(response.objects || []);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load work items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadObjects();
  }, [filters.objectType]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      objectType: requestedType,
    }));
    setSelectedObjectId(requestedId);
  }, [requestedId, requestedType]);

  const visibleObjects = useMemo(() => {
    const needle = String(filters.search || '').trim().toLowerCase();
    if (!needle) {
      return objects;
    }

    return objects.filter((object) =>
      [
        object.customer?.displayName,
        object.customer?.phone,
        object.customer?.email,
        object.summary,
        object.serviceType,
        object.appointmentType,
        object.propertyAddress,
        object.requestType,
        object.status,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(needle)
    );
  }, [filters.search, objects]);

  const activeObject = useMemo(
    () => visibleObjects.find((object) => object.id === selectedObjectId) || visibleObjects[0] || null,
    [selectedObjectId, visibleObjects]
  );

  useEffect(() => {
    if (!activeObject?.id) {
      setSelectedObject(null);
      return;
    }

    let active = true;
    async function loadDetail() {
      try {
        setLoadingDetail(true);
        const response = await fetchGraphObjectDetail(activeObject.objectType, activeObject.id);
        if (!active) return;
        setSelectedObject(response.object || null);
      } catch (detailError) {
        if (!active) return;
        setError(detailError?.response?.data?.error || detailError?.message || 'Failed to load work item detail.');
        setSelectedObject(null);
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [activeObject?.id, activeObject?.objectType]);

  useEffect(() => {
    if (!selectedObject?.sourceEventId) {
      setSourceEventDetail(null);
      setSourceEventContext(null);
      setLoadingSourceEvent(false);
      return;
    }

    let active = true;
    async function loadSourceEvent() {
      try {
        setLoadingSourceEvent(true);
        const [detailResponse, sourceResponse] = await Promise.all([
          fetchInteractionEventDetail(selectedObject.sourceEventId),
          fetchInteractionEventSource(selectedObject.sourceEventId),
        ]);
        if (!active) return;
        setSourceEventDetail(detailResponse.event || null);
        setSourceEventContext(sourceResponse.source || null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load linked interaction context.');
        setSourceEventDetail(null);
        setSourceEventContext(null);
      } finally {
        if (active) setLoadingSourceEvent(false);
      }
    }

    loadSourceEvent();
    return () => {
      active = false;
    };
  }, [selectedObject?.sourceEventId]);

  useEffect(() => {
    if (!activeObject?.id) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', activeObject.objectType);
    nextParams.set('id', activeObject.id);
    setSearchParams(nextParams, { replace: true });
  }, [activeObject?.id, activeObject?.objectType]);

  function handleOpenCustomer360() {
    if (!selectedObject?.customerId) return;
    navigate(`/voice/customer-360/${selectedObject.customerId}`);
  }

  function handleOpenInteractionReview() {
    if (!selectedObject?.sourceEventId) return;
    navigate(`/voice/intelligence?eventId=${encodeURIComponent(selectedObject.sourceEventId)}`);
  }

  function handleOpenNotificationCenter() {
    if (!selectedObject?.sourceEventId) return;
    navigate(`/voice/notifications?interactionEventId=${encodeURIComponent(selectedObject.sourceEventId)}`);
  }

  function handleOpenSourceSurface() {
    const sourceType = sourceEventDetail?.sourceType;
    if (!sourceType) {
      return;
    }

    if (sourceType === 'call_session') {
      const callId = sourceEventContext?.callSession?.id || sourceEventDetail?.sourceRefId;
      if (!callId) {
        return;
      }
      navigate(`/voice/calls?callId=${encodeURIComponent(callId)}`);
      return;
    }

    if (sourceType === 'sms_message') {
      const contactPhone =
        sourceEventContext?.message?.contactPhone ||
        sourceEventContext?.message?.from ||
        sourceEventContext?.message?.to ||
        sourceEventDetail?.customer?.phone;
      if (!contactPhone) {
        return;
      }
      const nextParams = new URLSearchParams();
      nextParams.set('contactPhone', contactPhone);
      if (sourceEventDetail?.sourceRefId) {
        nextParams.set('messageSid', sourceEventDetail.sourceRefId);
      }
      navigate(`/voice/sms?${nextParams.toString()}`);
    }
  }

  function getStatusOptions(objectType) {
    if (objectType === 'appointment') {
      return ['requested', 'confirmed', 'completed', 'cancel_requested', 'cancelled'];
    }
    if (objectType === 'quote') {
      return ['requested', 'reviewed', 'quoted', 'won', 'lost', 'closed'];
    }
    return ['open', 'triaged', 'in_progress', 'resolved', 'closed'];
  }

  async function handleObjectUpdate(payload) {
    if (!selectedObject?.objectType || !selectedObject?.id) {
      return;
    }

    try {
      setUpdatingObject(true);
      setError('');
      setSuccess('');
      const response = await updateGraphObject(selectedObject.objectType, selectedObject.id, payload);
      setSelectedObject(response.object || null);
      await loadObjects({ silent: true });
      setSuccess('Work item updated.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (updateError) {
      setError(updateError?.response?.data?.error || updateError?.message || 'Failed to update work item.');
    } finally {
      setUpdatingObject(false);
    }
  }

  const currentUserLabel = user?.displayName || userClaims?.name || user?.email || userClaims?.email || 'Current user';

  const summaryCards = [
    { label: 'Visible items', value: visibleObjects.length },
    { label: 'Appointments', value: objects.filter((item) => item.objectType === 'appointment').length },
    { label: 'Quotes', value: objects.filter((item) => item.objectType === 'quote').length },
    { label: 'Service requests', value: objects.filter((item) => item.objectType === 'service_request').length },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Graph Operations</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Work Items</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review graph-backed appointments, quotes, and service requests captured from calls and SMS.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.objectType}
            onChange={(event) => setFilters((current) => ({ ...current, objectType: event.target.value }))}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search customer, address, summary, or service"
          />
          <button
            type="button"
            onClick={() => loadObjects({ silent: true })}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Queue</h2>
              <p className="text-sm text-slate-500">
                {visibleObjects.length} work item{visibleObjects.length === 1 ? '' : 's'} in the current view
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading work items…
              </div>
            ) : null}
            {!loading && !visibleObjects.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No graph-backed work items match the current filters.
              </div>
            ) : null}

            {!loading && visibleObjects.map((object) => (
              <button
                type="button"
                key={object.id}
                onClick={() => setSelectedObjectId(object.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  activeObject?.id === object.id
                    ? 'border-blue-300 bg-blue-50/70'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {formatObjectType(object.objectType)}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {object.status || 'unknown'}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">
                      {object.customer?.displayName || object.customer?.phone || object.customer?.email || object.id}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{summarizeObject(object)}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{formatTimestamp(object.updatedAt || object.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {loadingDetail ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading work item detail…
            </div>
          ) : null}

          {!loadingDetail && selectedObject ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                    {formatObjectType(selectedObject.objectType)}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{summarizeObject(selectedObject)}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedObject.customer?.displayName || 'Unknown customer'}
                    {selectedObject.customer?.phone ? ` · ${selectedObject.customer.phone}` : ''}
                    {selectedObject.customer?.email ? ` · ${selectedObject.customer.email}` : ''}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Updated {formatTimestamp(selectedObject.updatedAt || selectedObject.createdAt)}</p>
                  <p className="mt-1">Status {selectedObject.status || '—'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedObject.customerId ? (
                  <button
                    type="button"
                    onClick={handleOpenCustomer360}
                    className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    Open Customer 360
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleObjectUpdate({ assignToCurrentUser: true })}
                  disabled={updatingObject}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {updatingObject ? 'Saving…' : 'Assign to me'}
                </button>
                {selectedObject.assignedTo ? (
                  <button
                    type="button"
                    onClick={() => handleObjectUpdate({ clearAssignment: true })}
                    disabled={updatingObject}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {updatingObject ? 'Saving…' : 'Clear owner'}
                  </button>
                ) : null}
                {selectedObject.sourceEventId ? (
                  <button
                    type="button"
                    onClick={handleOpenInteractionReview}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Open Intelligence Review
                  </button>
                ) : null}
                {selectedObject.sourceEventId ? (
                  <button
                    type="button"
                    onClick={handleOpenNotificationCenter}
                    className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    Open Notification Center
                  </button>
                ) : null}
                {sourceEventDetail?.sourceType ? (
                  <button
                    type="button"
                    onClick={handleOpenSourceSurface}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {sourceEventDetail.sourceType === 'sms_message' ? 'Open SMS Inbox' : 'Open Calls & Messages'}
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailCard label="Object ID" value={selectedObject.id} mono />
                <DetailCard label="Source Event" value={selectedObject.sourceEventId || '—'} mono />
                <DetailCard label="Requested Date" value={selectedObject.requestedDate || '—'} />
                <DetailCard label="Requested Time" value={selectedObject.requestedTime || selectedObject.confirmedTime || '—'} />
                <DetailCard label="Urgency" value={selectedObject.urgency || '—'} />
                <DetailCard label="Review Status" value={selectedObject.reviewStatus || '—'} />
                <DetailCard label="Property Address" value={selectedObject.propertyAddress || '—'} />
                <DetailCard label="Service Type" value={selectedObject.serviceType || selectedObject.appointmentType || selectedObject.requestType || '—'} />
                <DetailCard
                  label="Assigned To"
                  value={
                    selectedObject.assignedTo?.name ||
                    selectedObject.assignedTo?.email ||
                    selectedObject.assignedTo?.uid ||
                    'Unassigned'
                  }
                />
                <DetailCard label="Assigned At" value={formatTimestamp(selectedObject.assignedAt)} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Operator Actions</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Current user: {currentUserLabel}
                    </p>
                  </div>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    value={selectedObject.status || ''}
                    onChange={(event) => handleObjectUpdate({ status: event.target.value })}
                    disabled={updatingObject}
                  >
                    {getStatusOptions(selectedObject.objectType).map((status) => (
                      <option key={status} value={status}>
                        {formatObjectType(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Linked Interaction</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Source event {selectedObject.sourceEventId || '—'}
                    </p>
                  </div>
                  {loadingSourceEvent ? (
                    <p className="text-xs text-slate-500">Loading linked interaction…</p>
                  ) : null}
                </div>

                {sourceEventDetail ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DetailCard label="Event Type" value={formatObjectType(sourceEventDetail.eventType)} />
                    <DetailCard label="Review Status" value={formatObjectType(sourceEventDetail.reviewStatus || 'pending_review')} />
                    <DetailCard label="Channel" value={String(sourceEventDetail.channel || '—').toUpperCase()} />
                    <DetailCard label="Source Type" value={formatObjectType(sourceEventDetail.sourceType || '—')} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    {selectedObject.sourceEventId
                      ? 'Linked interaction detail will appear here after load.'
                      : 'No interaction event is linked to this work item yet.'}
                  </p>
                )}

                {sourceEventDetail?.rawSummary || sourceEventContext?.message?.body || sourceEventContext?.callSession?.transcriptSummary ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Interaction Summary</p>
                    <p className="mt-2 whitespace-pre-wrap">
                      {sourceEventDetail?.rawSummary ||
                        sourceEventContext?.callSession?.transcriptSummary ||
                        sourceEventContext?.callSession?.messageSummary?.message ||
                        sourceEventContext?.message?.body ||
                        'No summary available.'}
                    </p>
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700">Raw Record</h3>
                <pre className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                  {JSON.stringify(selectedObject.raw || {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          {!loadingDetail && !selectedObject ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Select a work item to inspect its graph-backed detail.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
