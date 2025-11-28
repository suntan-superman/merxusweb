import { useEffect, useState, useMemo } from 'react';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { useNewItemNotifications } from '../../hooks/useNotifications';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import CallTable from '../../components/calls/CallTable';
import CallDetailDrawer from '../../components/calls/CallDetailDrawer';

export default function CallsPage() {
  const { restaurantId } = useAuth();
  const [error, setError] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Build Firestore collection path
  const collectionPath = restaurantId ? `restaurants/${restaurantId}/calls` : null;

  // Query options
  const queryOptions = useMemo(
    () => ({
      orderBy: [{ field: 'startedAt', direction: 'desc' }],
      limit: 100,
    }),
    []
  );

  // Use Firestore real-time listener
  const { data: calls = [], loading, error: listenerError } = useFirestoreCollection(
    collectionPath,
    queryOptions
  );

  // Show notifications for new calls
  useNewItemNotifications(calls, 'call', { autoRequest: true });

  // Update error state if listener has error
  useEffect(() => {
    if (listenerError) {
      setError('Failed to load calls. Please refresh the page.');
    }
  }, [listenerError]);

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
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Calls & Messages</h2>
        <p className="text-sm text-gray-600 mt-1">
          View call history, transcripts, and customer communications
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && calls.length === 0 ? (
        <LoadingSpinner text="Loading calls…" />
      ) : (
        <CallTable calls={calls} onCallClick={openCall} />
      )}

      <CallDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        call={selectedCall}
      />
    </div>
  );
}

