// Flyer Approvals Page
// Manage pending flyer send requests

import { useState, useEffect } from 'react';
import { fetchFlyerQueue, approveFlyerQueue, declineFlyerQueue, fetchFlyerMetrics } from '../../api/estate';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../../components/common/ConfirmationModal';

export default function FlyerApprovalsPage() {
  const [queue, setQueue] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [queueData, metricsData] = await Promise.all([
        fetchFlyerQueue(),
        fetchFlyerMetrics(),
      ]);
      setQueue(queueData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      toast.error('Failed to load flyer approvals');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(item) {
    try {
      setProcessing(item.id);
      await approveFlyerQueue(item.id);
      toast.success('Flyer sent successfully!');
      await loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Failed to send flyer');
    } finally {
      setProcessing(null);
    }
  }

  async function handleDecline(item) {
    setSelectedItem(item);
    setShowDeclineModal(true);
  }

  async function confirmDecline() {
    try {
      setProcessing(selectedItem.id);
      await declineFlyerQueue(selectedItem.id);
      toast.success('Flyer request declined');
      await loadData();
    } catch (error) {
      console.error('Failed to decline:', error);
      toast.error('Failed to decline flyer');
    } finally {
      setProcessing(null);
      setShowDeclineModal(false);
      setSelectedItem(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/estate/dashboard"
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
          >
            Dashboard
          </Link>
          <span className="text-gray-400 dark:text-slate-500">→</span>
          <span className="font-semibold text-gray-900 dark:text-slate-100">Flyer Approvals</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">📧 Flyer Approvals</h1>
        <p className="mt-1 text-gray-600 dark:text-slate-300">
          Review and approve flyer send requests from AI calls
        </p>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-500/50 dark:from-slate-900 dark:to-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.pending}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Sent</p>
              <p className="text-2xl font-bold text-green-600">{metrics.sent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Declined</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-slate-200">{metrics.declined}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Queue */}
      {queue.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">All Caught Up!</h3>
          <p className="text-gray-600 dark:text-slate-300">No pending flyer approvals at the moment.</p>
          <Link
            to="/estate/dashboard"
            className="inline-block mt-6 btn-primary"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Pending Approvals ({queue.length})
            </h2>
            <button
              onClick={loadData}
              className="btn-secondary text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {queue.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-none"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Left Side - Property Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏠</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {item.listingAddress || 'Property'}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">To:</span>
                          <span>{item.recipientName || 'Unknown'}</span>
                          <span className="text-gray-400 dark:text-slate-500">•</span>
                          <span>{item.recipientEmail || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">From Call:</span>
                          <span>{item.callSid || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Requested:</span>
                          <span>
                            {item.queuedAt
                              ? new Date(item.queuedAt).toLocaleString()
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-3">
                        {item.queueStatus === 'auto_send_ready' ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/35 dark:text-green-200">
                            ✅ Auto-Send Ready (All conditions met)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/35 dark:text-yellow-200">
                            ⏳ Pending Agent Approval
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flyer Preview Link */}
                  {item.flyerUrl && (
                    <div className="mt-4 pl-15">
                      <a
                        href={item.flyerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        📄 Preview Flyer →
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Side - Actions */}
                <div className="flex lg:flex-col gap-2 lg:w-48">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processing === item.id}
                    className="btn-primary flex-1 lg:w-full"
                  >
                    {processing === item.id ? '⏳ Sending...' : '✅ Approve & Send'}
                  </button>
                  <button
                    onClick={() => handleDecline(item)}
                    disabled={processing === item.id}
                    className="btn-secondary flex-1 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30 lg:w-full"
                  >
                    🚫 Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decline Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false);
          setSelectedItem(null);
        }}
        onConfirm={confirmDecline}
        title="Decline Flyer Send?"
        message={`Are you sure you want to decline sending the flyer for "${selectedItem?.listingAddress || 'this property'}" to ${selectedItem?.recipientEmail}?`}
        confirmText="Decline"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}
