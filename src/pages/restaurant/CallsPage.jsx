import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { useNewItemNotifications } from '../../hooks/useNotifications';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EscalatedCallsAlert from '../../components/calls/EscalatedCallsAlert';
import CallTable from '../../components/calls/CallTable';
import CallDetailDrawer from '../../components/calls/CallDetailDrawer';
import SpeechOperationsPanel from '../../components/calls/SpeechOperationsPanel';
import { matchesSpeechFilter } from '../../utils/callSpeech';

export default function CallsPage() {
  const { restaurantId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [speechFilter, setSpeechFilter] = useState('all');
  const requestedCallId = searchParams.get('callId') || '';

  // Build Firestore collection path - query root callSessions filtered by restaurantId
  const collectionPath = 'callSessions';

  // Query options - filter by restaurantId and order by date
  const queryOptions = useMemo(
    () => ({
      where: restaurantId ? [{ field: 'restaurantId', operator: '==', value: restaurantId }] : [],
      orderBy: [{ field: 'endedAt', direction: 'desc' }],
      limit: 100,
    }),
    [restaurantId]
  );

  // Use Firestore real-time listener
  const { data: calls = [], loading, error: listenerError } = useFirestoreCollection(
    collectionPath,
    queryOptions
  );

  const filteredCalls = useMemo(
    () => calls.filter((call) => matchesSpeechFilter(call, speechFilter)),
    [calls, speechFilter]
  );

  // Show notifications for new calls
  useNewItemNotifications(calls, 'call', { autoRequest: true });

  // Update error state if listener has error
  useEffect(() => {
    if (listenerError) {
      setError('Failed to load calls. Please refresh the page.');
    }
  }, [listenerError]);

  useEffect(() => {
    if (!requestedCallId || !calls.length) {
      return;
    }
    const requestedCall = calls.find((call) => call.id === requestedCallId);
    if (!requestedCall) {
      return;
    }
    setSelectedCall(requestedCall);
    setDrawerOpen(true);
  }, [calls, requestedCallId]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'escape': () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        setSelectedCall(null);
      }
    },
  });

  function openCall(call) {
    setSelectedCall(call);
    setDrawerOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('callId', call.id);
    setSearchParams(nextParams);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedCall(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('callId');
    setSearchParams(nextParams);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Calls & Messages</h2>
        <p className="text-sm text-gray-600 mt-1">
          View call history, transcripts, and customer communications
        </p>
      </div>

      <SpeechOperationsPanel
        calls={calls}
        filteredCalls={filteredCalls}
        speechFilter={speechFilter}
        onSpeechFilterChange={setSpeechFilter}
        tenantType="restaurant"
      />

      <EscalatedCallsAlert calls={calls} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && calls.length === 0 ? (
        <LoadingSpinner text="Loading calls…" />
      ) : (
        <CallTable calls={filteredCalls} onCallClick={openCall} />
      )}

      <CallDetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        call={selectedCall}
      />
    </div>
  );
}

