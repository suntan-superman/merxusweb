import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import CallDetailDrawer from '../../components/calls/CallDetailDrawer';

export default function VoicemailPage() {
  const { officeId } = useAuth();
  const [selectedCall, setSelectedCall] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Query for all calls for this office
  const queryOptions = useMemo(
    () => ({
      where: [
        { field: 'officeId', operator: '==', value: officeId },
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 200, // Get more calls to filter for voicemails
    }),
    [officeId]
  );

  // Use Firestore real-time listener
  const { data: calls = [], loading, error } = useFirestoreCollection(
    officeId ? 'callSessions' : null,
    queryOptions
  );

  // Filter to only show calls over 20 seconds (voicemails/messages) with transcripts
  const voicemails = useMemo(() => {
    return calls.filter(call => {
      // Must have duration >= 20 seconds (voicemail threshold)
      const hasDuration = call.durationSec && call.durationSec >= 20;
      
      // Must have some transcript content
      const hasTranscript = call.transcript || 
                           call.callerTranscript || 
                           call.assistantTranscript;
      
      return hasDuration && hasTranscript;
    });
  }, [calls]);

  function openCall(call) {
    setSelectedCall(call);
    setDrawerOpen(true);
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voicemail</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage voicemail messages from callers
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
            <div className="flex gap-2">
              <button className="text-sm text-gray-600 hover:text-gray-900">
                Mark all as read
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {voicemails.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Voicemails
              </h3>
              <p className="text-gray-600">
                Voicemail messages will appear here when callers leave messages (calls over 20 seconds)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {voicemails.map((call) => {
                // Extract customer info
                const customerName = call.customerName || 
                                  call.parsedMessage?.name || 
                                  call.parsedOrder?.name || 
                                  call.parsedReservation?.name || 
                                  'Unknown';
                const customerPhone = call.customerPhone || 
                                     call.parsedMessage?.phone || 
                                     call.parsedOrder?.phone || 
                                     call.parsedReservation?.phone || 
                                     call.from || 
                                     '';
                
                // Format date
                const date = call.startedAt?.toDate ? call.startedAt.toDate() : 
                           (call.startedAt?.seconds ? new Date(call.startedAt.seconds * 1000) : 
                           (call.startedAt ? new Date(call.startedAt) : 
                           (call.createdAt?.toDate ? call.createdAt.toDate() : 
                           (call.createdAt?.seconds ? new Date(call.createdAt.seconds * 1000) : 
                           (call.createdAt ? new Date(call.createdAt) : null)))));
                const formattedDate = date && !isNaN(date.getTime()) 
                  ? date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                  : 'Date unknown';
                
                // Get summary or excerpt from transcript
                const summary = call.transcriptSummary || 
                               call.parsedMessage?.message ||
                               (call.transcript ? call.transcript.substring(0, 150) + '...' : 'No transcript available');

                return (
                  <div
                    key={call.id}
                    onClick={() => openCall(call)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {customerName}
                          </h4>
                          {customerPhone && (
                            <span className="text-xs text-gray-500">
                              {formatPhone(customerPhone)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {summary}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formattedDate}</span>
                          {call.durationSec && (
                            <span>{formatDuration(call.durationSec)}</span>
                          )}
                        </div>
                      </div>
                      {call.callType === 'message' && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-800">
                          Message
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CallDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedCall(null);
        }}
        call={selectedCall}
      />
    </div>
  );
}

function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

