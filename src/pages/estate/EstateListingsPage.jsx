import { useEffect, useState } from 'react';
import { fetchListings, createListing, updateListing, deleteListing } from '../../api/estate';
import ListingsTable from '../../components/listings/ListingsTable';
import ListingForm from '../../components/listings/ListingForm';
import ListingImport from '../../components/listings/ListingImport';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EstateListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);

  async function loadListings() {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchListings();
      setListings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, []);

  function handleAddNew() {
    setEditingListing(null);
    setFormOpen(true);
  }

  function handleEdit(listing) {
    setEditingListing(listing);
    setFormOpen(true);
  }

  async function handleSave(listingData) {
    try {
      if (editingListing) {
        const updated = await updateListing(editingListing.id, listingData);
        setListings((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      } else {
        const created = await createListing(listingData);
        setListings((prev) => [{ ...created, id: created.id }, ...prev]);
      }
      setFormOpen(false);
      setEditingListing(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save listing.');
    }
  }

  function handleDelete(listing) {
    setListingToDelete(listing);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!listingToDelete) return;
    try {
      await deleteListing(listingToDelete.id);
      setListings((prev) => prev.filter((l) => l.id !== listingToDelete.id));
      setShowDeleteModal(false);
      setListingToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete listing.');
      setShowDeleteModal(false);
      setListingToDelete(null);
    }
  }

  function handleStatusChange(listing, newStatus) {
    updateListing(listing.id, { status: newStatus })
      .then((updated) => {
        setListings((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to update listing status.');
      });
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Listings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your property listings
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="btn-secondary"
            >
              📥 Import CSV/Excel
            </button>
            <button onClick={handleAddNew} className="btn-primary">
              + Add Listing
            </button>
          </div>
        </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ListingsTable
        listings={listings}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      <ListingForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingListing(null);
        }}
        onSave={handleSave}
        editing={editingListing}
      />

      {importOpen && (
        <ListingImport
          onImportComplete={loadListings}
          onClose={() => setImportOpen(false)}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setListingToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Listing"
        message={`Are you sure you want to delete the listing at ${listingToDelete?.address || 'this address'}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

