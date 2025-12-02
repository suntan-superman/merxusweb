import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import LoadingSpinner from '../../components/LoadingSpinner';
import VoiceCallTable from '../../components/calls/voice/VoiceCallTable';
import CallDetailDrawer from '../../components/calls/CallDetailDrawer';

export default function EstateCallsPage() {
  const { agentId } = useAuth();
  const [selectedCall, setSelectedCall] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: calls = [], loading } = useFirestoreCollection(
    agentId ? 'callSessions' : null,
    agentId
      ? {
          where: [{ field: 'agentId', operator: '==', value: agentId }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
          limit: 500,
        }
      : {}
  );

  const handleCallClick = (call) => {
    setSelectedCall(call);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCall(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calls & Messages</h2>
          <p className="text-sm text-gray-600 mt-1">
            View call history and transcripts
          </p>
        </div>
      </div>

      <VoiceCallTable calls={calls} onCallClick={handleCallClick} />

      <CallDetailDrawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        call={selectedCall}
      />
    </div>
  );
}

