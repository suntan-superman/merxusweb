import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestoreDocument } from '../../hooks/useFirestoreListener';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import './POSIntegrationPage.css';

export default function POSIntegrationPage() {
  const { restaurantId } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [toastRestaurantId, setToastRestaurantId] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.toasttab.com');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Fetch existing config
  const { data: restaurant } = useFirestoreDocument(
    restaurantId ? doc(db, 'restaurants', restaurantId) : null
  );

  useEffect(() => {
    if (restaurant?.toastConfig) {
      setApiKey(restaurant.toastConfig.apiKey || '');
      setApiSecret(restaurant.toastConfig.apiSecret || '');
      setToastRestaurantId(restaurant.toastConfig.toastRestaurantId || '');
      setEndpoint(restaurant.toastConfig.endpoint || 'https://api.toasttab.com');
    }
  }, [restaurant]);

  const handleSaveConfig = async () => {
    if (!apiKey || !apiSecret || !toastRestaurantId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restaurantRef, {
        toastConfig: {
          apiKey,
          apiSecret,
          toastRestaurantId,
          endpoint,
          enabled: true,
          savedAt: new Date(),
        },
      });
      toast.success('Toast configuration saved!');
    } catch (error) {
      toast.error('Failed to save configuration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !apiSecret || !toastRestaurantId) {
      toast.error('Please save configuration first');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/pos/test-toast-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          apiKey,
          apiSecret,
          toastRestaurantId,
          endpoint,
        }),
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast.success('✅ Connection successful!');
      } else {
        toast.error('❌ Connection failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Test failed: ' + error.message);
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pos/sync-toast-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`✅ Menu synced! ${result.itemCount} items imported.`);
      } else {
        toast.error('❌ Sync failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Sync error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const lastMenuSync = restaurant?.toastConfig?.lastMenuSync;
  const menuItemCount = restaurant?.toastConfig?.menuItemCount || 0;

  return (
    <div className="pos-integration-page">
      <div className="container">
        <h1>🍳 Toast POS Integration</h1>
        <p className="subtitle">Connect your Toast POS system to sync orders and menus</p>

        <div className="config-section">
          <h2>Configuration</h2>

          <div className="form-group">
            <label>Toast API Key *</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Toast API key"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Toast API Secret *</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your Toast API secret"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Toast Restaurant ID *</label>
            <input
              type="text"
              value={toastRestaurantId}
              onChange={(e) => setToastRestaurantId(e.target.value)}
              placeholder="Your restaurant ID in Toast"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Toast Endpoint</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.toasttab.com"
              disabled={loading}
            />
          </div>

          <div className="button-group">
            <button onClick={handleSaveConfig} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
            <button onClick={handleTestConnection} disabled={loading} className="btn-secondary">
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <h3>{testResult.success ? '✅ Success' : '❌ Failed'}</h3>
            <p>{testResult.message || testResult.error}</p>
          </div>
        )}

        <div className="status-section">
          <h2>Status</h2>

          <div className="status-grid">
            <div className="status-card">
              <h3>Integration Status</h3>
              <p className={`status-badge ${restaurant?.toastConfig?.enabled ? 'enabled' : 'disabled'}`}>
                {restaurant?.toastConfig?.enabled ? '🟢 Enabled' : '🔴 Disabled'}
              </p>
            </div>

            <div className="status-card">
              <h3>Menu Items</h3>
              <p className="status-value">{menuItemCount} items</p>
            </div>

            <div className="status-card">
              <h3>Last Sync</h3>
              <p className="status-value">
                {lastMenuSync ? new Date(lastMenuSync).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="sync-section">
          <h2>Menu Sync</h2>
          <p>Manually trigger a menu sync from Toast to update your AI agent's knowledge</p>
          <button onClick={handleManualSync} disabled={loading} className="btn-primary">
            {loading ? 'Syncing...' : 'Sync Menu Now'}
          </button>
        </div>

        <div className="info-section">
          <h2>ℹ️ How It Works</h2>
          <ul>
            <li>✅ Menu syncs automatically daily from Toast</li>
            <li>📱 AI agent knows current items and prices</li>
            <li>📤 Orders captured from calls push to Toast automatically</li>
            <li>🔔 Order confirmation numbers stored for call confirmation</li>
            <li>📊 View order status in Orders dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
