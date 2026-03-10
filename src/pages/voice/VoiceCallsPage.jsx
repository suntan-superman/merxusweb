import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { useNewItemNotifications } from '../../hooks/useNotifications';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EscalatedCallsAlert from '../../components/calls/EscalatedCallsAlert';
import VoiceCallTable from '../../components/calls/voice/VoiceCallTable';
import CallDetailDrawer from '../../components/calls/CallDetailDrawer';
import SpeechOperationsPanel from '../../components/calls/SpeechOperationsPanel';
import { matchesSpeechFilter } from '../../utils/callSpeech';

// Helper to get date range based on filter
function getDateRange(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { start: weekStart, end: new Date() };
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: new Date() };
    case 'all':
    default:
      return null;
  }
}

export default function VoiceCallsPage() {
  const { officeId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const requestedCallId = searchParams.get('callId') || '';
  const [dateFilter, setDateFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voiceCallsDateFilter') || 'all';
    }
    return 'all';
  });
  const [speechFilter, setSpeechFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voiceCallsSpeechFilter') || 'all';
    }
    return 'all';
  });

  // Persist filter to localStorage
  useEffect(() => {
    localStorage.setItem('voiceCallsDateFilter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('voiceCallsSpeechFilter', speechFilter);
  }, [speechFilter]);

  // Query options for callSessions with officeId and date filters
  const queryOptions = useMemo(
    () => {
      const effectiveDateFilter = requestedCallId ? 'all' : dateFilter;
      const dateRange = getDateRange(effectiveDateFilter);
      const where = [{ field: 'officeId', operator: '==', value: officeId }];
      
      if (dateRange) {
        where.push({ field: 'endedAt', operator: '>=', value: dateRange.start });
        where.push({ field: 'endedAt', operator: '<=', value: dateRange.end });
      }
      
      return {
        where,
        orderBy: [{ field: 'endedAt', direction: 'desc' }],
        limit: 100,
      };
    },
    [officeId, dateFilter, requestedCallId]
  );

  // Use Firestore real-time listener
  const { data: calls = [], loading, error: listenerError } = useFirestoreCollection(
    officeId ? 'callSessions' : null,
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calls & Messages</h2>
          <p className="text-sm text-gray-600 mt-1">
            View call history, transcripts, and customer communications
          </p>
        </div>
        
        <div className="flex gap-2">
          {['today', 'week', 'month', 'all'].map(filter => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === filter
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter === 'today' && 'Today'}
              {filter === 'week' && 'This Week'}
              {filter === 'month' && 'This Month'}
              {filter === 'all' && 'All'}
            </button>
          ))}
        </div>
      </div>

      <SpeechOperationsPanel
        calls={calls}
        filteredCalls={filteredCalls}
        speechFilter={speechFilter}
        onSpeechFilterChange={setSpeechFilter}
        tenantType="voice"
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
        <VoiceCallTable calls={filteredCalls} onCallClick={openCall} />
      )}

      <CallDetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        call={selectedCall}
      />
    </div>
  );
}
