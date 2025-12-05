import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { updateLead, fetchFlyerLogs } from '../../api/estate';
import LeadsTable from '../../components/leads/LeadsTable';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EstateLeadsPage() {
  const { agentId } = useAuth();
  const [error, setError] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [flyerLogs, setFlyerLogs] = useState([]);
  const [flyerLogsError, setFlyerLogsError] = useState(null);

  const { data: leads = [], loading } = useFirestoreCollection(
    agentId ? `agents/${agentId}/leads` : null,
    agentId
      ? {
          orderBy: [{ field: 'captured_at', direction: 'desc' }],
        }
      : {}
  );

  async function handleStatusChange(lead, newPriority) {
    try {
      setError(null);
      await updateLead(lead.id, { priority: newPriority });
    } catch (err) {
      console.error(err);
      setError('Failed to update lead priority.');
    }
  }

  function handleEdit(lead) {
    setSelectedLead(lead);
    // TODO: Open lead detail modal/drawer
  }

  async function loadFlyerLogs() {
    try {
      setFlyerLogsError(null);
      const data = await fetchFlyerLogs({ limit: 200 });
      setFlyerLogs(data);
    } catch (err) {
      console.error(err);
      setFlyerLogsError('Failed to load flyer logs.');
    }
  }

  useEffect(() => {
    loadFlyerLogs();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage leads captured from calls and inquiries
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{leads.length}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <LeadsTable
        leads={leads}
        flyerLogs={flyerLogs}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
      />

      {/* TODO: Lead Detail Modal/Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Lead Details</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <strong>Name:</strong> {selectedLead.caller_name || 'Unknown'}
              </div>
              <div>
                <strong>Phone:</strong> {selectedLead.caller_phone || 'N/A'}
              </div>
              <div>
                <strong>Email:</strong> {selectedLead.caller_email || 'N/A'}
              </div>
              <div>
                <strong>Priority:</strong> {selectedLead.priority || 'warm'}
              </div>
              {selectedLead.notes && (
                <div>
                  <strong>Notes:</strong> {selectedLead.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

