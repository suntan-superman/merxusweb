import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Loader, RefreshCw, Trash2, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';

/**
 * Toast POS Integration Admin Page
 * Allows restaurants to configure and manage Toast POS integration
 */
export default function ToastPOSIntegrationPage() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    toastRestaurantId: '',
    endpoint: 'https://api.toasttab.com',
  });

  const [showApiSecret, setShowApiSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Fetch Toast configuration
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['toast-config', restaurantId],
    queryFn: async () => {
      const response = await fetch(
        `/api/pos/toast/config?restaurantId=${restaurantId}`
      );
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  // Fetch Toast status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['toast-status', restaurantId],
    queryFn: async () => {
      const response = await fetch(
        `/api/pos/toast/status?restaurantId=${restaurantId}`
      );
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch menu sync history
  const { data: syncHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['toast-sync-history', restaurantId],
    queryFn: async () => {
      const response = await fetch(
        `/api/pos/toast/menu-sync-history?restaurantId=${restaurantId}&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  // Configure Toast mutation
  const configureMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/pos/toast/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, ...data }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Configuration failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Toast POS configured successfully',
        variant: 'success',
      });
      queryClient.invalidateQueries(['toast-config', restaurantId]);
      queryClient.invalidateQueries(['toast-status', restaurantId]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pos/toast/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Connection test failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Toast connection test successful',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Manual sync mutation
  const syncMenuMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pos/toast/sync-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Menu sync failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Menu synced successfully (${data.result.itemCount} items)`,
        variant: 'success',
      });
      queryClient.invalidateQueries(['toast-sync-history', restaurantId]);
      queryClient.invalidateQueries(['toast-status', restaurantId]);
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Disable integration mutation
  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/pos/toast/config?restaurantId=${restaurantId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to disable');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Disabled',
        description: 'Toast integration has been disabled',
        variant: 'success',
      });
      queryClient.invalidateQueries(['toast-config', restaurantId]);
      queryClient.invalidateQueries(['toast-status', restaurantId]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    configureMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (configLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const config = configData?.config || {};
  const status = statusData?.status || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toast POS Integration</h1>
          <p className="mt-1 text-gray-600">
            Connect your restaurant to Toast POS to automatically push AI-captured orders
          </p>
        </div>
      </div>

      {/* Status Card */}
      {status.enabled && (
        <Card className="border-green-200 bg-green-50 p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">Connected to Toast</h3>
              <p className="text-sm text-green-800 mt-1">
                {status.menuItemCount} menu items synced • Last updated:{' '}
                {status.menuLastSynced
                  ? new Date(status.menuLastSynced).toLocaleDateString()
                  : 'Never'}
              </p>
              {status.failedOrdersCount > 0 && (
                <p className="text-sm text-orange-700 mt-1">
                  ⚠️ {status.failedOrdersCount} failed orders pending retry
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {!status.enabled && (
        <Card className="border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900">Toast Not Connected</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Configure Toast POS below to start accepting AI-captured orders
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toast API Key *
            </label>
            <Input
              type="text"
              name="apiKey"
              value={formData.apiKey || config.apiKey || ''}
              onChange={handleInputChange}
              placeholder="Your Toast API key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toast API Secret *
            </label>
            <div className="relative">
              <Input
                type={showApiSecret ? 'text' : 'password'}
                name="apiSecret"
                value={formData.apiSecret}
                onChange={handleInputChange}
                placeholder="Your Toast API secret"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiSecret(!showApiSecret)}
                className="absolute right-3 top-2.5 text-gray-500 text-sm"
              >
                {showApiSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toast Restaurant ID *
            </label>
            <Input
              type="text"
              name="toastRestaurantId"
              value={formData.toastRestaurantId || config.restaurantId || ''}
              onChange={handleInputChange}
              placeholder="Your Toast restaurant/location ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toast API Endpoint
            </label>
            <Input
              type="text"
              name="endpoint"
              value={formData.endpoint}
              onChange={handleInputChange}
              placeholder="https://api.toasttab.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use sandbox endpoint for testing: https://sandbox-api.toasttab.com
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={configureMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {configureMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTestingConnection(true);
                testConnectionMutation.mutate();
              }}
              disabled={testConnectionMutation.isPending}
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Menu Management */}
      {status.enabled && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Menu Management</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-gray-900">{status.menuItemCount} items synced</p>
                <p className="text-sm text-gray-600">
                  Last synced:{' '}
                  {status.menuLastSynced
                    ? new Date(status.menuLastSynced).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <Button
                onClick={() => syncMenuMutation.mutate()}
                disabled={syncMenuMutation.isPending}
                variant="outline"
              >
                {syncMenuMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>

            {status.failedOrdersCount > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="font-medium text-orange-900">
                  ⚠️ {status.failedOrdersCount} Failed Orders
                </p>
                <p className="text-sm text-orange-800">
                  These orders failed to sync and are pending retry
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Sync History */}
      {status.enabled && syncHistoryData?.data && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Sync History</h2>

          {syncHistoryData.data.length === 0 ? (
            <p className="text-gray-600">No sync history available</p>
          ) : (
            <div className="space-y-2">
              {syncHistoryData.data.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium text-gray-900">{entry.type}</p>
                    <p className="text-sm text-gray-600">{entry.error}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Danger Zone */}
      {status.enabled && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h2 className="text-xl font-semibold mb-4 text-red-900">Danger Zone</h2>
          <p className="text-sm text-red-800 mb-4">
            Disabling Toast integration will stop automatic order syncing. Orders will still be
            captured but won't reach your POS system.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                confirm(
                  'Are you sure? This will disable Toast POS integration for this restaurant.'
                )
              ) {
                disableMutation.mutate();
              }
            }}
            disabled={disableMutation.isPending}
          >
            {disableMutation.isPending ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Disabling...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Disable Toast Integration
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Documentation */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-lg font-semibold mb-2 text-blue-900">Need Help?</h2>
        <p className="text-sm text-blue-800 mb-3">
          To get your Toast API credentials:
        </p>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Log in to your Toast account</li>
          <li>Go to Settings → Integrations → API Integrations</li>
          <li>Create a new OAuth application or API key</li>
          <li>Copy the API Key and Secret above</li>
          <li>Find your Restaurant/Location ID in Settings → Locations</li>
        </ol>
      </Card>
    </div>
  );
}
