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
          <p className="mt-4 text-gray-600">Loading approvals...</p>
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
            className="text-gray-400 hover:text-gray-600"
          >
            Dashboard
          </Link>
          <span className="text-gray-400">→</span>
          <span className="text-gray-900 font-semibold">Flyer Approvals</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">📧 Flyer Approvals</h1>
        <p className="text-gray-600 mt-1">
          Review and approve flyer send requests from AI calls
        </p>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.pending}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-green-600">{metrics.sent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Declined</p>
              <p className="text-2xl font-bold text-gray-600">{metrics.declined}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Queue */}
      {queue.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending flyer approvals at the moment.</p>
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
            <h2 className="text-lg font-semibold text-gray-900">
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
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Left Side - Property Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏠</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.listingAddress || 'Property'}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">To:</span>
                          <span>{item.recipientName || 'Unknown'}</span>
                          <span className="text-gray-400">•</span>
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
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Auto-Send Ready (All conditions met)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
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
                    className="btn-secondary flex-1 lg:w-full text-red-600 hover:bg-red-50"
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
