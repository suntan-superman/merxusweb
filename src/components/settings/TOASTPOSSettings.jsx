// Toast POS Integration Settings Component

import { useState, useEffect } from 'react';
import { connectToast, disconnectToast, getToastStatus, syncMenuFromToast } from '../../api/toast';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

export default function ToastPOSSettings() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    restaurantGuid: '',
  });

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      const status = await getToastStatus();
      setConnected(status.connected);
    } catch (error) {
      console.error('Failed to check Toast status:', error);
      toast.error('Failed to check Toast POS status');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e) {
    e.preventDefault();
    
    try {
      setLoading(true);
      const result = await connectToast(credentials);
      
      if (result.success) {
        toast.success('Toast POS connected successfully!');
        setConnected(true);
        setShowConnectForm(false);
        setCredentials({ clientId: '', clientSecret: '', restaurantGuid: '' });
        
        // Auto-sync menu after connection
        handleSyncMenu();
      } else {
        toast.error(result.error || 'Failed to connect Toast POS');
      }
    } catch (error) {
      console.error('Toast connection error:', error);
      toast.error(error.response?.data?.details || 'Failed to connect Toast POS');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    try {
      setLoading(true);
      await disconnectToast();
      toast.success('Toast POS disconnected');
      setConnected(false);
      setShowDisconnectModal(false);
    } catch (error) {
      console.error('Toast disconnect error:', error);
      toast.error('Failed to disconnect Toast POS');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncMenu() {
    try {
      setSyncing(true);
      const result = await syncMenuFromToast();
      
      if (result.success) {
        toast.success(
          `Menu synced! ${result.itemsAdded} added, ${result.itemsUpdated} updated, ${result.itemsRemoved} removed`
        );
      } else {
        toast.error(result.error || 'Menu sync failed');
      }
    } catch (error) {
      console.error('Menu sync error:', error);
      toast.error('Failed to sync menu from Toast');
    } finally {
      setSyncing(false);
    }
  }

  if (loading && !connected) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Toast POS</h3>
              <p className="text-sm text-gray-600">
                {connected ? '✅ Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          
          {connected ? (
            <div className="flex gap-2">
              <button
                onClick={handleSyncMenu}
                disabled={syncing}
                className="btn-secondary"
              >
                {syncing ? 'Syncing...' : '🔄 Sync Menu'}
              </button>
              <button
                onClick={() => setShowDisconnectModal(true)}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectForm(true)}
              className="btn-primary"
            >
              Connect Toast
            </button>
          )}
        </div>

        {connected && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ <strong>Active:</strong> Menu items sync hourly. Orders from Merxus AI automatically push to Toast POS.
            </p>
          </div>
        )}

        {!connected && !showConnectForm && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Benefits:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ Automatic menu synchronization</li>
              <li>✅ Orders from AI calls appear in Toast instantly</li>
              <li>✅ Inventory awareness (86'd items)</li>
              <li>✅ No manual order entry required</li>
            </ul>
          </div>
        )}
      </div>

      {/* Connect Form */}
      {showConnectForm && !connected && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Connect Toast POS</h4>
          
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                className="input-field"
                placeholder="Your Toast Client ID"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your Toast Developer Portal
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                className="input-field"
                placeholder="Your Toast Client Secret"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Keep this confidential
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant GUID
              </label>
              <input
                type="text"
                value={credentials.restaurantGuid}
                onChange={(e) => setCredentials({ ...credentials, restaurantGuid: e.target.value })}
                className="input-field"
                placeholder="Your Toast Restaurant GUID"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your unique restaurant identifier in Toast
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConnectForm(false);
                  setCredentials({ clientId: '', clientSecret: '', restaurantGuid: '' });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="text-sm font-semibold text-blue-900 mb-2">
              📚 Need help getting your Toast credentials?
            </h5>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Log in to your Toast account</li>
              <li>Go to Toast Developer Portal</li>
              <li>Create an API application (if you haven't already)</li>
              <li>Copy your Client ID, Client Secret, and Restaurant GUID</li>
              <li>Paste them above</li>
            </ol>
            <a
              href="https://dev.toasttab.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 underline mt-2 inline-block"
            >
              Open Toast Developer Portal →
            </a>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Toast POS?"
        message="Orders from Merxus AI will no longer be sent to Toast automatically. You can reconnect anytime."
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="warning"
      />
    </>
  );
}
