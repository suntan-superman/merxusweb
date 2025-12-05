import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { updateLead, fetchFlyerLogs } from '../../api/estate';
import LeadsTable from '../../components/leads/LeadsTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import LeadDetailModal from '../../components/leads/LeadDetailModal';

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

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          flyerLogs={flyerLogs}
          onClose={() => setSelectedLead(null)}
          onUpdate={loadFlyerLogs}
        />
      )}
    </div>
  );
}

