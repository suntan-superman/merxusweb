import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchInteractionEventDetail,
  fetchInteractionEvents,
  fetchInteractionEventSource,
  reviewInteractionEvent,
} from '../../api/intelligence';
import { getNativeObjectRoute, getPortalBasePath } from '../../utils/objectRouting';

function toneForReviewStatus(status) {
  if (status === 'approved' || status === 'auto_approved') {
    return 'bg-green-100 text-green-700';
  }
  if (status === 'dismissed') {
    return 'bg-slate-200 text-slate-700';
  }
  return 'bg-amber-100 text-amber-700';
}

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

function normalizeBasis(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveCustomerObjectTarget(graphRefs = {}) {
  const candidates = [
    { key: 'showingId', section: 'showings', label: 'Open Showing' },
    { key: 'reservationId', section: 'reservations', label: 'Open Reservation' },
    { key: 'orderId', section: 'orders', label: 'Open Order' },
    { key: 'appointmentId', section: 'appointments', label: 'Open Appointment' },
    { key: 'quoteId', section: 'quotes', label: 'Open Quote' },
    { key: 'serviceRequestId', section: 'serviceRequests', label: 'Open Service Request' },
    { key: 'propertyId', section: 'properties', label: 'Open Property' },
  ];

  const match = candidates.find((candidate) => graphRefs?.[candidate.key]);
  if (!match) {
    return null;
  }

  return {
    label: match.label,
    section: match.section,
    focusId: graphRefs[match.key],
  };
}

function copyForTenant(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Interaction Intelligence',
      subtitle: 'Review structured reservation, order, and guest-intake events captured from calls and SMS.',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'Interaction Intelligence',
      subtitle: 'Review structured lead, property, and showing events captured from calls and SMS.',
    };
  }
  return {
    title: 'Interaction Intelligence',
    subtitle: 'Review structured support, quote, and appointment events captured from calls and SMS.',
  };
}

const REVIEW_OPTIONS = [
  { value: '', label: 'All review states' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'auto_approved', label: 'Auto approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'All channels' },
  { value: 'voice', label: 'Voice' },
  { value: 'sms', label: 'SMS' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'call_session', label: 'Call Session' },
  { value: 'sms_message', label: 'SMS Message' },
];

export default function InteractionIntelligenceWorkspace({ tenantType }) {
  const copy = copyForTenant(tenantType);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedEventId = searchParams.get('eventId') || '';
  const [filters, setFilters] = useState({
    days: 30,
    limit: 100,
    reviewStatus: 'pending_review',
    channel: '',
    eventType: '',
    sourceType: '',
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [selectedEventSource, setSelectedEventSource] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewedPayloadText, setReviewedPayloadText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewingAction, setReviewingAction] = useState('');

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      const response = await fetchInteractionEvents({
        days: filters.days,
        limit: filters.limit,
        reviewStatus: filters.reviewStatus,
        channel: filters.channel,
        eventType: filters.eventType,
        sourceType: filters.sourceType,
      });
      setEvents(response.events || []);
      setSummary(response.summary || null);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load interaction events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filters.days, filters.limit, filters.reviewStatus, filters.channel, filters.eventType, filters.sourceType]);

  const eventTypeOptions = useMemo(() => {
    const dynamic = (summary?.byEventType || []).map((item) => ({
      value: item.eventType,
      label: String(item.eventType || 'unknown').replace(/_/g, ' '),
    }));
    return [{ value: '', label: 'All event types' }, ...dynamic];
  }, [summary]);

  const filteredEvents = useMemo(() => {
    const needle = String(filters.search || '').trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) => {
      const haystack = [
        event.eventType,
        event.channel,
        event.customer?.name,
        event.customer?.phone,
        event.customer?.email,
        event.rawSummary,
        event.rawText,
        Object.values(event.payload || {}).join(' '),
      ]
        .map((part) => String(part || '').toLowerCase())
        .join(' ');
      return haystack.includes(needle);
    });
  }, [events, filters.search]);

  const selectedEvent = useMemo(() => {
    if (selectedEventId) {
      return filteredEvents.find((event) => event.id === selectedEventId) || null;
    }
    return filteredEvents[0] || null;
  }, [filteredEvents, selectedEventId]);
  const selectedEventRecord = selectedEventDetail || selectedEvent || null;

  useEffect(() => {
    if (requestedEventId && requestedEventId !== selectedEventId) {
      setSelectedEventId(requestedEventId);
      return;
    }

    if (!selectedEvent && !selectedEventId) {
      if (!filteredEvents.length) {
        setSelectedEventDetail(null);
        setSelectedEventSource(null);
        setReviewNotes('');
        setReviewedPayloadText('');
        return;
      }
      setSelectedEventId(filteredEvents[0].id);
      return;
    }

    if (!selectedEvent) {
      if (!filteredEvents.length && !requestedEventId) {
        setSelectedEventId('');
        setSelectedEventDetail(null);
        setSelectedEventSource(null);
        setReviewNotes('');
        setReviewedPayloadText('');
      }
      return;
    }

    setReviewNotes(selectedEvent.reviewNotes || '');
    setReviewedPayloadText(JSON.stringify(selectedEvent.reviewedPayload || selectedEvent.payload || {}, null, 2));
  }, [filteredEvents, requestedEventId, selectedEvent, selectedEventId]);

  useEffect(() => {
    const currentEventId = searchParams.get('eventId') || '';
    if ((selectedEventId || '') === currentEventId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (selectedEventId) {
      nextParams.set('eventId', selectedEventId);
    } else {
      nextParams.delete('eventId');
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, selectedEventId, setSearchParams]);

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEventDetail(null);
      setSelectedEventSource(null);
      return;
    }

    let active = true;
    async function loadSelectedEventContext() {
      try {
        setLoadingDetail(true);
        const [detailResponse, sourceResponse] = await Promise.all([
          fetchInteractionEventDetail(selectedEventId),
          fetchInteractionEventSource(selectedEventId),
        ]);
        if (!active) return;
        setSelectedEventDetail(detailResponse.event || null);
        setSelectedEventSource(sourceResponse.source || null);
        if (detailResponse.event) {
          setReviewNotes(detailResponse.event.reviewNotes || '');
          setReviewedPayloadText(JSON.stringify(detailResponse.event.reviewedPayload || detailResponse.event.payload || {}, null, 2));
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load interaction event detail.');
        setSelectedEventDetail(null);
        setSelectedEventSource(null);
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    loadSelectedEventContext();
    return () => {
      active = false;
    };
  }, [selectedEventId]);

  async function handleReview(nextStatus) {
    if (!selectedEventRecord?.id) return;
    try {
      let reviewedPayload = null;
      if (reviewedPayloadText.trim()) {
        try {
          reviewedPayload = JSON.parse(reviewedPayloadText);
        } catch (_) {
          setError('Reviewed payload must be valid JSON.');
          return;
        }
      }

      setReviewingAction(nextStatus);
      setError('');
      setSuccess('');
      const response = await reviewInteractionEvent(selectedEventRecord.id, {
        reviewStatus: nextStatus,
        reviewNotes,
        reviewedPayload,
      });

      setSelectedEventDetail(response.event || null);
      setEvents((current) =>
        current.map((event) => (event.id === selectedEventRecord.id ? response.event : event))
      );
      setSuccess(`Interaction event ${nextStatus.replace(/_/g, ' ')}.`);
      await loadData({ silent: true });
    } catch (reviewError) {
      setError(reviewError?.response?.data?.error || reviewError?.message || 'Failed to review interaction event.');
    } finally {
      setReviewingAction('');
    }
  }

  function handleOpenCustomer(customerId, options = {}) {
    if (!customerId) return;
    const basePath = `${getPortalBasePath(tenantType)}/customer-360`;
    const searchParams = new URLSearchParams();
    if (options.section) {
      searchParams.set('section', options.section);
    }
    if (options.focusId) {
      searchParams.set('focusId', options.focusId);
    }
    const query = searchParams.toString();
    navigate(`${basePath}/${customerId}${query ? `?${query}` : ''}`);
  }

  function handleOpenSourceSurface() {
    if (!selectedEventRecord?.sourceType) {
      return;
    }

    const portalBasePath = getPortalBasePath(tenantType);
    if (selectedEventRecord.sourceType === 'call_session') {
      const callId = selectedEventSource?.callSession?.id || selectedEventRecord.sourceRefId;
      if (!callId) {
        return;
      }
      navigate(`${portalBasePath}/calls?callId=${encodeURIComponent(callId)}`);
      return;
    }

    if (selectedEventRecord.sourceType === 'sms_message') {
      const contactPhone =
        selectedEventSource?.message?.contactPhone ||
        selectedEventSource?.message?.from ||
        selectedEventSource?.message?.to ||
        selectedEventRecord.customer?.phone;
      if (!contactPhone) {
        return;
      }
      const searchParams = new URLSearchParams();
      searchParams.set('contactPhone', contactPhone);
      if (selectedEventRecord.sourceRefId) {
        searchParams.set('messageSid', selectedEventRecord.sourceRefId);
      }
      navigate(`${portalBasePath}/sms?${searchParams.toString()}`);
    }
  }

  function handleOpenNotificationCenter() {
    if (!selectedEventRecord?.id) {
      return;
    }
    const portalBasePath = getPortalBasePath(tenantType);
    navigate(`${portalBasePath}/notifications?interactionEventId=${encodeURIComponent(selectedEventRecord.id)}`);
  }

  function handleOpenNativeObject() {
    const target = getNativeObjectRoute(tenantType, selectedEventRecord?.graphRefs || {});
    if (!target?.path) {
      return;
    }
    navigate(target.path);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">SII Foundation</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Total" value={summary?.total || 0} />
            <SummaryCard label="Pending" value={summary?.pendingReview || 0} />
            <SummaryCard label="Approved" value={(summary?.approved || 0) + (summary?.autoApproved || 0)} />
            <SummaryCard label="Dismissed" value={summary?.dismissed || 0} />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {summary?.withSchemaIssues || 0} event{summary?.withSchemaIssues === 1 ? '' : 's'} currently have schema issues or missing required fields.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.reviewStatus}
            onChange={(event) => setFilters((current) => ({ ...current, reviewStatus: event.target.value }))}
          >
            {REVIEW_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.channel}
            onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.eventType}
            onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value }))}
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            value={filters.sourceType}
            onChange={(event) => setFilters((current) => ({ ...current, sourceType: event.target.value }))}
          >
            {SOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 md:col-span-5"
            placeholder="Search names, phones, summaries, or payloads"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Review Queue</h2>
              <p className="text-sm text-slate-500">
                {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'} in the current view
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading interaction events…
              </div>
            ) : null}

            {!loading && filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No interaction events match the current filters.
              </div>
            ) : null}

            {!loading && filteredEvents.map((event) => (
              <button
                type="button"
                key={event.id}
                onClick={() => {
                  setSelectedEventId(event.id);
                  setReviewNotes(event.reviewNotes || '');
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedEvent?.id === event.id
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {event.channel}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneForReviewStatus(event.reviewStatus)}`}>
                        {String(event.reviewStatus || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">
                      {String(event.eventType || 'unknown').replace(/_/g, ' ')}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {event.customer?.name || event.customer?.phone || event.customer?.email || 'Unknown customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500">
                      Confidence {(Number(event.confidence || 0) * 100).toFixed(0)}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatTimestamp(event.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {event.rawSummary || event.rawText || 'No summary available.'}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedEventRecord ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    {selectedEventRecord.channel} · {selectedEventRecord.sourceType?.replace(/_/g, ' ')}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {String(selectedEventRecord.eventType || 'unknown').replace(/_/g, ' ')}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedEventRecord.customer?.name || 'Unknown customer'} · {selectedEventRecord.customer?.phone || selectedEventRecord.customer?.email || 'No contact'}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{formatTimestamp(selectedEventRecord.createdAt)}</p>
                  <p className="mt-1">Confidence {(Number(selectedEventRecord.confidence || 0) * 100).toFixed(0)}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {getNativeObjectRoute(tenantType, selectedEventRecord?.graphRefs || {}) ? (
                  <button
                    type="button"
                    onClick={handleOpenNativeObject}
                    className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    {getNativeObjectRoute(tenantType, selectedEventRecord?.graphRefs || {}).label}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleOpenNotificationCenter}
                  className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                >
                  Open Notification Center
                </button>
                {selectedEventRecord.graphRefs?.customerId && resolveCustomerObjectTarget(selectedEventRecord.graphRefs) ? (
                  <button
                    type="button"
                    onClick={() => handleOpenCustomer(
                      selectedEventRecord.graphRefs.customerId,
                      resolveCustomerObjectTarget(selectedEventRecord.graphRefs)
                    )}
                    className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    {resolveCustomerObjectTarget(selectedEventRecord.graphRefs).label}
                  </button>
                ) : null}
                {selectedEventRecord.graphRefs?.customerId ? (
                  <button
                    type="button"
                    onClick={() => handleOpenCustomer(selectedEventRecord.graphRefs.customerId)}
                    className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    {resolveCustomerObjectTarget(selectedEventRecord.graphRefs) ? 'Open Customer 360 Root' : 'Open Customer 360'}
                  </button>
                ) : null}
              </div>

              {loadingDetail ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Refreshing interaction detail…
                </div>
              ) : null}

              <DetailBlock title="Payload" value={selectedEventRecord.payload} />
              {selectedEventRecord.validation?.issues?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Schema Issues</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {selectedEventRecord.validation.issues.map((issue) => (
                      <li key={issue}>{String(issue).replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedEventRecord.routingPreview?.groupKeys?.length ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  <p className="font-semibold">Suggested Staff Routing</p>
                  <p className="mt-2">
                    {selectedEventRecord.routingPreview.groupKeys.map((groupKey) => groupKey.replace(/_/g, ' ')).join(' • ')}
                  </p>
                  {normalizeBasis(selectedEventRecord.routingPreview.basis).length ? (
                    <p className="mt-2 text-xs text-sky-700">
                      Basis: {normalizeBasis(selectedEventRecord.routingPreview.basis).map((item) => String(item).replace(/_/g, ' ')).join(' • ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <DetailBlock title="Extracted Fields" value={selectedEventRecord.extractedFields} />
              <DetailBlock title="Automation Recommendations" value={selectedEventRecord.automationRecommendations} />

              {selectedEventSource ? (
                <SourceDetailBlock
                  source={selectedEventSource}
                  onOpenSourceSurface={handleOpenSourceSurface}
                  sourceType={selectedEventRecord.sourceType}
                />
              ) : null}

              {selectedEventRecord.reviewHistory?.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Review History</h3>
                  <div className="mt-2 space-y-3">
                    {selectedEventRecord.reviewHistory.map((entry, index) => (
                      <div key={`${selectedEventRecord.id}-history-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-semibold">
                          {String(entry.reviewStatus || 'unknown').replace(/_/g, ' ')} · {formatTimestamp(entry.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.reviewedBy?.email || entry.reviewedBy?.uid || 'Unknown reviewer'}
                        </p>
                        {entry.previousReviewStatus ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Previous: {String(entry.previousReviewStatus).replace(/_/g, ' ')}
                          </p>
                        ) : null}
                        {entry.reviewNotes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{entry.reviewNotes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Reviewed Payload</label>
                <textarea
                  rows={12}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs leading-6 text-slate-700"
                  value={reviewedPayloadText}
                  onChange={(event) => setReviewedPayloadText(event.target.value)}
                  placeholder="Edit normalized payload JSON before approving."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Review Notes</label>
                <textarea
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Add operator context, corrections, or merge notes."
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleReview('approved')}
                  disabled={Boolean(reviewingAction)}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {reviewingAction === 'approved' ? 'Saving…' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('pending_review')}
                  disabled={Boolean(reviewingAction)}
                  className="rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                >
                  {reviewingAction === 'pending_review' ? 'Saving…' : 'Keep in Review'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('dismissed')}
                  disabled={Boolean(reviewingAction)}
                  className="rounded-full border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                >
                  {reviewingAction === 'dismissed' ? 'Saving…' : 'Dismiss'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Select an interaction event to review extracted fields and notes.
            </div>
          )}
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

function DetailBlock({ title, value }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <pre className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </div>
  );
}

function SourceDetailBlock({ source, sourceType, onOpenSourceSurface }) {
  if (!source) return null;

  const callSession = source.callSession || null;
  const message = source.message || null;
  const threadMessages = source.conversation?.threadMessages || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Source Context</h3>
        {onOpenSourceSurface ? (
          <button
            type="button"
            onClick={onOpenSourceSurface}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
          >
            {sourceType === 'sms_message' ? 'Open SMS Inbox' : 'Open Calls & Messages'}
          </button>
        ) : null}
      </div>
      {callSession ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">Call Session</p>
          <p className="mt-2">Caller: {callSession.customerName || callSession.caller_name || callSession.from || 'Unknown'}</p>
          <p className="mt-1">Status: {callSession.status || 'unknown'}</p>
          <p className="mt-1">Summary: {callSession.transcriptSummary || callSession.messageSummary?.message || 'No summary available.'}</p>
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">Source Message</p>
          <p className="mt-2">Direction: {String(message.direction || 'unknown').replace(/_/g, ' ')}</p>
          <p className="mt-1">From: {message.from || '—'}</p>
          <p className="mt-1">To: {message.to || '—'}</p>
          <p className="mt-1">Status: {message.status || '—'}</p>
          <p className="mt-2 whitespace-pre-wrap">{message.body || 'No message body.'}</p>
        </div>
      ) : null}
      {threadMessages.length ? (
        <div>
          <p className="text-sm font-semibold text-slate-700">Recent Thread</p>
          <div className="mt-2 space-y-3">
            {threadMessages.map((messageItem) => (
              <div key={messageItem.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {String(messageItem.direction || 'unknown').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500">{formatTimestamp(messageItem.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{messageItem.body || 'No message body.'}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
