import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreListener';
import { fetchListings, createShowing, updateShowing, deleteShowing } from '../../api/estate';
import ShowingsTable from '../../components/showings/ShowingsTable';
import ShowingForm from '../../components/showings/ShowingForm';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EstateShowingsPage() {
  const { agentId } = useAuth();
  const [showings, setShowings] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingShowing, setEditingShowing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showingToDelete, setShowingToDelete] = useState(null);

  // Fetch showings from Firestore
  const { data: showingsData = [], loading: showingsLoading } = useFirestoreCollection(
    agentId ? `agents/${agentId}/showings` : null,
    agentId
      ? {
          orderBy: [{ field: 'scheduled_date', direction: 'asc' }],
        }
      : {}
  );

  useEffect(() => {
    setShowings(showingsData);
  }, [showingsData]);

  // Fetch listings for the form
  async function loadListings() {
    try {
      const data = await fetchListings();
      setListings(data);
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  }

  useEffect(() => {
    loadListings();
    setLoading(false);
  }, []);

  function handleAddNew() {
    setEditingShowing(null);
    setFormOpen(true);
  }

  function handleEdit(showing) {
    setEditingShowing(showing);
    setFormOpen(true);
  }

  async function handleSave(showingData) {
    try {
      if (editingShowing) {
        await updateShowing(editingShowing.id, showingData);
        setShowings((prev) => prev.map((s) => (s.id === editingShowing.id ? { ...s, ...showingData } : s)));
      } else {
        await createShowing(showingData);
        // The Firestore listener will update the list automatically
      }
      setFormOpen(false);
      setEditingShowing(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save showing.');
    }
  }

  function handleDelete(showing) {
    setShowingToDelete(showing);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!showingToDelete) return;
    try {
      await deleteShowing(showingToDelete.id);
      setShowings((prev) => prev.filter((s) => s.id !== showingToDelete.id));
      setShowDeleteModal(false);
      setShowingToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete showing.');
      setShowDeleteModal(false);
      setShowingToDelete(null);
    }
  }

  function handleStatusChange(showing, newStatus) {
    updateShowing(showing.id, { status: newStatus })
      .then(() => {
        setShowings((prev) => prev.map((s) => (s.id === showing.id ? { ...s, status: newStatus } : s)));
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to update showing status.');
      });
  }

  if (loading || showingsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Showings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Schedule and manage property showings
          </p>
        </div>
        <button onClick={handleAddNew} className="btn-primary">
          + Schedule Showing
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ShowingsTable
        showings={showings}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      <ShowingForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingShowing(null);
        }}
        onSave={handleSave}
        editing={editingShowing}
        listings={listings}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setShowingToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Showing"
        message={`Are you sure you want to delete the showing scheduled for ${showingToDelete?.scheduled_date || 'this date'}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

