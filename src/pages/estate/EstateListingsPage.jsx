import { useEffect, useState } from 'react';
import {
  fetchListings,
  createListing,
  updateListing,
  deleteListing,
  fetchFlyerQueue,
  approveFlyerQueue,
  declineFlyerQueue,
  fetchFlyerLogs,
} from '../../api/estate';
import ListingsTable from '../../components/listings/ListingsTable';
import ListingForm from '../../components/listings/ListingForm';
import ListingImport from '../../components/listings/ListingImport';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';

import { sendTestFlyer } from '../../api/estate';

function promptTestEmail(defaultEmail = '') {
  const input = window.prompt('Enter a test email to send the flyer to:', defaultEmail);
  if (!input) return null;
  return input.trim();
}

export default function EstateListingsPage() {
  const [toast, setToast] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flyerQueue, setFlyerQueue] = useState([]);
  const [flyerQueueLoading, setFlyerQueueLoading] = useState(false);
  const [flyerQueueError, setFlyerQueueError] = useState(null);
  const [flyerLogs, setFlyerLogs] = useState([]);
  const [flyerLogsError, setFlyerLogsError] = useState(null);
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

  async function loadFlyerQueue() {
    try {
      setFlyerQueueError(null);
      setFlyerQueueLoading(true);
      const data = await fetchFlyerQueue(50);
      setFlyerQueue(data);
    } catch (err) {
      console.error(err);
      setFlyerQueueError('Failed to load flyer approvals.');
    } finally {
      setFlyerQueueLoading(false);
    }
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
    loadListings();
    loadFlyerQueue();
    loadFlyerLogs();
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

  async function handleApproveFlyer(queueId) {
    try {
      await approveFlyerQueue(queueId);
      await loadFlyerQueue();
    } catch (err) {
      console.error(err);
      setFlyerQueueError('Failed to approve flyer send.');
    }
  }

  async function handleDeclineFlyer(queueId) {
    try {
      await declineFlyerQueue(queueId);
      await loadFlyerQueue();
    } catch (err) {
      console.error(err);
      setFlyerQueueError('Failed to decline flyer send.');
    }
  }

  async function handleTestSend(listing) {
    try {
      const email = promptTestEmail();
      if (!email) return;
      await sendTestFlyer(listing.id, email);
      setToast({ type: 'success', message: `Test flyer sent to ${email}` });
      await loadFlyerLogs();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to send test flyer.' });
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-500/50 dark:bg-green-900/30 dark:text-green-200'
              : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/50 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Listings</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
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

      {/* Flyer approvals */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Flyer Approvals</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Review and approve/decline flyer send requests (only when a flyer exists).
            </p>
          </div>
          <button
            onClick={loadFlyerQueue}
            className="btn-secondary"
            disabled={flyerQueueLoading}
          >
            {flyerQueueLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {flyerQueueError && (
          <div className="mb-2 text-sm text-red-600 dark:text-red-300">{flyerQueueError}</div>
        )}
        {flyerQueueLoading ? (
          <div className="text-sm text-gray-600 dark:text-slate-300">Loading approvals…</div>
        ) : flyerQueue.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-slate-300">No pending approvals.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200">Lead</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200">Property</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200">Listing</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {flyerQueue.map((item) => {
                  const status = item.status || 'pending_agent_approval';
                  const canApprove = status === 'pending_agent_approval';
                  const listing = listings.find((l) => l.id === item.listingId);
                  const hasFlyer = listing?.flyerUrl || listing?.flyerURL || item.flyerUrl;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-slate-100">
                        {item.leadName || 'Unknown'}<br />
                        <span className="text-xs text-gray-500 dark:text-slate-400">{item.callSid || item.callId || '—'}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-slate-100">{item.leadEmail || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-slate-100">{item.propertyAddress || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-slate-100">
                        {listing ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{listing.address || listing.title || listing.name || listing.propertyAddress}</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {listing.price ? `$${listing.price}` : ''} {listing.bedrooms ? `• ${listing.bedrooms}bd` : ''} {listing.bathrooms ? `• ${listing.bathrooms}ba` : ''}
                            </span>
                            {hasFlyer ? (
                              <a
                                href={hasFlyer}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-green-700 dark:text-green-300"
                              >
                                Flyer available
                              </a>
                            ) : (
                              <span className="text-xs text-red-600 dark:text-red-300">No flyer on listing</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-slate-400">Listing not matched</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/35 dark:text-yellow-200">
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex gap-2">
                          <button
                            className="btn-primary btn-xs"
                            onClick={() => handleApproveFlyer(item.id)}
                            disabled={!canApprove || !hasFlyer}
                            title={!hasFlyer ? 'Add flyer to listing to send' : 'Approve & send flyer'}
                          >
                            Approve & Send
                          </button>
                          <button
                            className="btn-secondary btn-xs"
                            onClick={() => handleDeclineFlyer(item.id)}
                            disabled={!canApprove}
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/50 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <ListingsTable
        listings={listings}
        flyerLogs={flyerLogs}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onTestSend={handleTestSend}
      />

      <ListingForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingListing(null);
        }}
        onSave={handleSave}
        editing={editingListing}
        onTestSend={handleTestSend}
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

